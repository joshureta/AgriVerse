const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
  quiet: true,
});

const { getSupabase } = require("../supabase");

function readAdminDetails(env = process.env) {
  const email = env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = env.ADMIN_PASSWORD;
  const fullName = env.ADMIN_FULL_NAME?.trim() || "Administrator";

  if (!email) {
    throw new Error("ADMIN_EMAIL is required");
  }

  if (password && password.length < 8) {
    throw new Error("ADMIN_PASSWORD must contain at least 8 characters");
  }

  return { email, fullName, password };
}

async function findUserByEmail(supabase, email) {
  let page = 1;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage: 1000,
    });

    if (error) {
      throw error;
    }

    const user = data.users.find(
      (candidate) => candidate.email?.toLowerCase() === email,
    );

    if (user) {
      return user;
    }

    if (data.users.length < 1000) {
      return null;
    }

    page += 1;
  }
}

async function provisionAdmin() {
  const { email, fullName, password } = readAdminDetails();
  const supabase = getSupabase();
  let user = await findUserByEmail(supabase, email);
  let createdUser = false;

  if (!user) {
    if (!password) {
      throw new Error(
        "ADMIN_PASSWORD is required when creating a new admin account",
      );
    }

    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (error) {
      throw error;
    }

    user = data.user;
    createdUser = true;
  }

  const { error: profileError } = await supabase.from("profiles").upsert(
    {
      id: user.id,
      full_name: fullName,
      role: "admin",
      worker_category: null,
    },
    { onConflict: "id" },
  );

  if (profileError) {
    if (createdUser) {
      await supabase.auth.admin.deleteUser(user.id);
    }

    throw profileError;
  }

  console.log(
    createdUser
      ? `Admin account created for ${email}.`
      : `Existing account ${email} was promoted to admin.`,
  );
}

if (require.main === module) {
  provisionAdmin().catch((error) => {
    console.error(`Unable to provision admin: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  findUserByEmail,
  provisionAdmin,
  readAdminDetails,
};
