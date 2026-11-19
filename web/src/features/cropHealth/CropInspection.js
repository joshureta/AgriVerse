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
      factorScores: null,
      factorRatings: null,
      visibleCropRegions: [],
      scoringMethod: null,
      coverage: null,
      isPartial: false,
      hasDiagnosis: false,
      assessmentSource: null,
      issues: [],
      recommendations: [],
      diseaseOrIssueName: 'Awaiting Inspection',
      healthStatus: 'Pending',
      visualSummary: 'No inspection has been recorded yet for this field. Select the observed descriptions to score it.',
      ...EMPTY_IMAGE,
      lastUpdated: 'No scans yet',
    }
  }

  static createReports(savedReports = {}) {
    return Object.fromEntries(
      FIELDS.map((field) => [field, this.withWeightedPartial({ ...this.createDefaultReport(), ...savedReports[field] })]),
    )
  }

  static withWeightedPartial(report) {
    if (report.scoringMethod !== 'equal-factor-severity-v1' || report.score != null) return report
    const factors = [
      ['cropCondition', 30],
      ['disease', 40],
      ['pest', 20],
      ['nutrient', 10],
    ]
    const available = factors.filter(([key]) => Number.isFinite(report.factorScores?.[key]))
    const coverage = available.reduce((total, [, weight]) => total + weight, 0)
    if (coverage === 0) return report
    const score = Math.round(available.reduce((total, [key, weight]) => total + report.factorScores[key] * weight, 0) / coverage)
    return {
      ...report,
      score,
      coverage,
      isPartial: coverage < 100,
      healthStatus: this.healthStatusFor(score),
      scoringMethod: 'available-weight-severity-v2',
    }
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
    return score == null ? 'Insufficient visual evidence' : score >= 81 ? 'Excellent' : score >= 61 ? 'Good' : score >= 41 ? 'Fair' : score >= 21 ? 'Poor' : 'Critical'
  }

  static activityFromDatabase(row) {
    const { date, time } = this.formatDateTime(row.created_at)
    return this.withWeightedPartial({
      id: row.id,
      date,
      time,
      score: row.health_score,
      factorScores: row.factor_scores || null,
      factorRatings: row.factor_scores?.ratings || null,
      visibleCropRegions: row.factor_scores?.regions || [],
      scoringMethod: row.factor_scores?.method || null,
      coverage: row.factor_scores?.coverage ?? null,
      isPartial: row.factor_scores?.coverage > 0 && row.factor_scores.coverage < 100,
      healthStatus: row.health_status || this.healthStatusFor(row.health_score),
      assessmentSource: row.assessment_source || 'legacy',
      field: row.field_name,
      disease: row.disease_or_issue_name,
      status: row.status || 'COMPLETED',
      issues: Array.isArray(row.identified_symptoms) ? row.identified_symptoms : [],
      recommendations: Array.isArray(row.action_recommendations) ? row.action_recommendations : [],
      summary: row.visual_summary || '',
      image: row.image_url || null,
    })
  }

  static reportFromDatabase(row) {
    const { date, time } = this.formatDateTime(row.created_at, 'short')
    return this.withWeightedPartial({
      score: row.health_score,
      factorScores: row.factor_scores || null,
      factorRatings: row.factor_scores?.ratings || null,
      visibleCropRegions: row.factor_scores?.regions || [],
      scoringMethod: row.factor_scores?.method || null,
      coverage: row.factor_scores?.coverage ?? null,
      isPartial: row.factor_scores?.coverage > 0 && row.factor_scores.coverage < 100,
      hasDiagnosis: true,
      assessmentSource: row.assessment_source || 'legacy',
      issues: Array.isArray(row.identified_symptoms) ? row.identified_symptoms : [],
      recommendations: Array.isArray(row.action_recommendations) ? row.action_recommendations : [],
      diseaseOrIssueName: row.disease_or_issue_name || 'Diagnosed Crop Stand',
      healthStatus: row.health_status || this.healthStatusFor(row.health_score),
      visualSummary: row.visual_summary || '',
      ...EMPTY_IMAGE,
      lastUpdated: `${date} at ${time}`,
    })
  }

  static reportFromDiagnosis(report, diagnosis, time) {
    return {
      ...report,
      score: diagnosis.score,
      factorScores: diagnosis.factorScores,
      factorRatings: diagnosis.factorRatings,
      visibleCropRegions: diagnosis.visibleCropRegions || [],
      scoringMethod: diagnosis.scoringMethod,
      coverage: diagnosis.coverage,
      isPartial: diagnosis.isPartial,
      hasDiagnosis: true,
      assessmentSource: 'rule-inspection',
      issues: diagnosis.issues,
      recommendations: diagnosis.recommendations,
      diseaseOrIssueName: diagnosis.diseaseOrIssueName,
      healthStatus: diagnosis.healthStatus,
      visualSummary: diagnosis.visualSummary,
      lastUpdated: `Today at ${time}`,
    }
  }

  static activityFromDiagnosis({ id, field, diagnosis, image, date, time }) {
    return {
      id,
      date,
      time,
      score: diagnosis.score,
      factorScores: diagnosis.factorScores,
      factorRatings: diagnosis.factorRatings,
      visibleCropRegions: diagnosis.visibleCropRegions || [],
      scoringMethod: diagnosis.scoringMethod,
      coverage: diagnosis.coverage,
      isPartial: diagnosis.isPartial,
      healthStatus: diagnosis.healthStatus,
      assessmentSource: 'rule-inspection',
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
    return this.withWeightedPartial({
      score: activity.score,
      factorScores: activity.factorScores || null,
      factorRatings: activity.factorRatings || null,
      visibleCropRegions: activity.visibleCropRegions || [],
      scoringMethod: activity.scoringMethod || null,
      coverage: activity.coverage ?? null,
      isPartial: activity.isPartial || false,
      hasDiagnosis: true,
      assessmentSource: activity.assessmentSource || 'legacy',
      issues: activity.issues || [],
      recommendations: activity.recommendations || [],
      diseaseOrIssueName: activity.disease || 'Historical Inspection',
      healthStatus: activity.healthStatus || this.healthStatusFor(activity.score),
      visualSummary: activity.summary || '',
      image: activity.image || null,
      imageName: `${activity.field} inspection photo`,
      imageMime: 'image/png',
      lastUpdated: `${activity.date} at ${activity.time}`,
    })
  }
}
