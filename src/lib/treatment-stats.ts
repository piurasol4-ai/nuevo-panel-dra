export type TreatmentStatPatient = {
  id: string;
  fullName: string;
  documentType: string;
  dni: string;
  dateISO: string;
  status: string;
  appointmentId: string;
};

export type TreatmentStatRow = {
  treatment: string;
  count: number;
  percent: number;
  patients: TreatmentStatPatient[];
};

export type TreatmentStatsResponse = {
  month: string;
  dateFrom: string;
  dateTo: string;
  totalSessions: number;
  distinctTreatments: number;
  breakdown: TreatmentStatRow[];
};
