export const FIELDS = ['Field A', 'Field B', 'Field C', 'Field D']

const EMPTY_IMAGE = { image: null, imageName: '', imageMime: null }

/**
 * A small model class that keeps crop-inspection data in one predictable shape.
 * The React page uses it for data conversion; it does not manage UI state.
 */
export class CropInspection {
  static createDefaultReport() {
    return {
      score: null,
      hasDiagnosis: false,
      issues: [],
      recommendations: [],
      diseaseOrIssueName: 'Awaiting Inspection',
      healthStatus: 'Pending',
      visualSummary: 'No scan has been performed yet for this sector. Upload a crop photo to diagnose.',
      ...EMPTY_IMAGE,
      lastUpdated: 'No scans yet',
    }
  }

  static createReports(savedReports = {}) {
    return Object.fromEntries(
      FIELDS.map((field) => [field, { ...this.createDefaultReport(), ...savedReports[field] }]),
    )
  }

  static withImage(report, file, image) {
    return { ...report, image, imageName: file.name, imageMime: file.type }
  }

  static withoutImage(report) {
    return { ...report, ...EMPTY_IMAGE }
  }

  static formatDateTime(value, month = 'long') {
    const date = new Date(value || Date.now())
    return {
      date: new Intl.DateTimeFormat('en-US', { month, day: 'numeric', year: month === 'long' ? 'numeric' : undefined }).format(date),
      time: new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date),
    }
  }

  static healthStatusFor(score) {
    return score >= 80 ? 'Healthy' : score >= 60 ? 'Attention Needed' : 'Critical'
  }

  static activityFromDatabase(row) {
    const { date, time } = this.formatDateTime(row.created_at)
    return {
      id: row.id,
      date,
      time,
      score: row.health_score,
      field: row.field_name,
      disease: row.disease_or_issue_name,
      status: row.status || 'COMPLETED',
      issues: Array.isArray(row.identified_symptoms) ? row.identified_symptoms : [],
      recommendations: Array.isArray(row.action_recommendations) ? row.action_recommendations : [],
      summary: row.visual_summary || '',
      image: row.image_url || null,
    }
  }

  static reportFromDatabase(row) {
    const { date, time } = this.formatDateTime(row.created_at, 'short')
    return {
      score: row.health_score,
      hasDiagnosis: true,
      issues: Array.isArray(row.identified_symptoms) ? row.identified_symptoms : [],
      recommendations: Array.isArray(row.action_recommendations) ? row.action_recommendations : [],
      diseaseOrIssueName: row.disease_or_issue_name || 'Diagnosed Crop Stand',
      healthStatus: row.health_status || this.healthStatusFor(row.health_score),
      visualSummary: row.visual_summary || '',
      ...EMPTY_IMAGE,
      lastUpdated: `${date} at ${time}`,
    }
  }

  static reportFromDiagnosis(report, diagnosis, time) {
    return {
      ...report,
      score: diagnosis.score,
      hasDiagnosis: true,
      issues: diagnosis.issues,
      recommendations: diagnosis.recommendations,
      diseaseOrIssueName: diagnosis.diseaseOrIssueName,
      healthStatus: diagnosis.healthStatus,
      visualSummary: diagnosis.visualSummary,
      ...EMPTY_IMAGE,
      lastUpdated: `Today at ${time}`,
    }
  }

  static activityFromDiagnosis({ id, field, diagnosis, image, date, time }) {
    return {
      id,
      date,
      time,
      score: diagnosis.score,
      field,
      disease: diagnosis.diseaseOrIssueName,
      status: 'COMPLETED',
      issues: diagnosis.issues,
      recommendations: diagnosis.recommendations,
      summary: diagnosis.visualSummary,
      image,
    }
  }

  static reportFromActivity(activity) {
    return {
      score: activity.score,
      hasDiagnosis: true,
      issues: activity.issues || [],
      recommendations: activity.recommendations || [],
      diseaseOrIssueName: activity.disease || 'Historical Inspection',
      healthStatus: this.healthStatusFor(activity.score),
      visualSummary: activity.summary || '',
      image: activity.image || null,
      imageName: `${activity.field} inspection photo`,
      imageMime: 'image/png',
      lastUpdated: `${activity.date} at ${activity.time}`,
    }
  }
}
