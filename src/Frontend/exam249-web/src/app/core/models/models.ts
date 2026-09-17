export enum UserRole {
  Admin = 1,
  Teacher = 2,
  Student = 3
}

export enum QuestionType {
  SingleChoice = 1,
  MultipleChoice = 2,
  FillInTheBlank = 3
}

export enum DifficultyLevel {
  Easy = 1,
  Medium = 2,
  Hard = 3
}

export enum ExamStatus {
  Draft = 1,
  Published = 2,
  Archived = 3
}

export enum SessionStatus {
  InProgress = 1,
  Submitted = 2,
  TimedOut = 3,
  Disqualified = 4
}

export enum ViolationType {
  TabSwitch = 1,
  FullscreenExit = 2,
  BlurLoss = 3,
  CopyPaste = 4,
  DevToolsShortcut = 5,
  MultipleSessions = 6,
  RapidAnswer = 7
}

export enum RiskLevel {
  Safe = 1,
  Suspicious = 2,
  HighRisk = 3,
  Critical = 4
}

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
  totalPages: number;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  role: UserRole;
  isActive: boolean;
  createdAtUtc: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresAtUtc: string;
  user: User;
}

export interface Subject {
  id: string;
  code: string;
  name: string;
  description: string;
}

export interface Classroom {
  id: string;
  name: string;
  code: string;
  description: string;
  teacherId: string;
  teacherName: string;
  subjectId: string;
  subjectName: string;
  studentCount: number;
  createdAtUtc: string;
}

export interface ClassroomStudent {
  studentId: string;
  studentName: string;
  studentEmail: string;
  joinedAtUtc: string;
}

export interface QuestionOption {
  id: string;
  content: string;
  isCorrect: boolean;
  orderIndex: number;
}

export interface Question {
  id: string;
  subjectId: string;
  subjectName: string;
  content: string;
  imageUrl?: string;
  type: QuestionType;
  difficulty: DifficultyLevel;
  defaultPoints: number;
  explanation?: string;
  tags: string[];
  options: QuestionOption[];
  acceptedAnswers: string[];
  createdAtUtc: string;
}

export interface Exam {
  id: string;
  title: string;
  description: string;
  subjectId: string;
  subjectName: string;
  classroomId: string;
  classroomName: string;
  teacherId: string;
  teacherName: string;
  startTimeUtc: string;
  endTimeUtc: string;
  durationMinutes: number;
  passingScore: number;
  maxAttempts: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResultsImmediately: boolean;
  allowReview: boolean;
  status: ExamStatus;
  questionCount: number;
  totalPoints: number;
  createdAtUtc: string;
}

export interface StudentOption {
  id: string;
  content: string;
  orderIndex: number;
}

export interface StudentQuestion {
  questionId: string;
  orderIndex: number;
  content: string;
  imageUrl?: string;
  type: QuestionType;
  points: number;
  options: StudentOption[];
}

export interface StudentAnswerItem {
  questionId: string;
  selectedOptionIds: string[];
  textAnswer?: string;
  isFlagged?: boolean;
}

export interface StudentExamView {
  sessionId: string;
  examId: string;
  examTitle: string;
  classroomName: string;
  durationMinutes: number;
  startedAtUtc: string;
  deadlineUtc: string;
  remainingSeconds: number;
  examVariantCode: string;
  questions: StudentQuestion[];
  currentAnswers: StudentAnswerItem[];
}

export interface SubmissionDetail {
  questionId: string;
  questionContent: string;
  type: QuestionType;
  pointsAwarded: number;
  maxPoints: number;
  isCorrect: boolean;
  selectedOptionIds: string[];
  textAnswer?: string;
  correctOptionIds: string[];
  acceptedAnswers: string[];
  explanation?: string;
}

export interface ExamResult {
  sessionId: string;
  examId: string;
  examTitle: string;
  studentId: string;
  studentName: string;
  startedAtUtc: string;
  submittedAtUtc: string;
  durationSeconds: number;
  totalScore: number;
  maxScore: number;
  scorePercentage: number;
  isPassed: boolean;
  riskScore: number;
  riskLevel: RiskLevel;
  canReview: boolean;
  details?: SubmissionDetail[];
}

export interface TeacherExamSubmissionItem {
  sessionId: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  startedAtUtc: string;
  submittedAtUtc: string;
  durationSeconds: number;
  totalScore: number;
  maxScore: number;
  scorePercentage: number;
  isPassed: boolean;
  riskScore: number;
  riskLevel: RiskLevel;
  violationsCount: number;
}

export interface ViolationEvent {
  id: string;
  sessionId: string;
  type: ViolationType;
  typeName: string;
  description: string;
  metadata?: string;
  penaltyPoints: number;
  timestampUtc: string;
  ipAddress?: string;
}

export interface ViolationBreakdownItem {
  type: ViolationType;
  typeName: string;
  count: number;
  totalPenalty: number;
}

export interface RiskScoreSummary {
  sessionId: string;
  totalRiskScore: number;
  riskLevel: RiskLevel;
  violationsCount: number;
  breakdown: ViolationBreakdownItem[];
  recentViolations: ViolationEvent[];
}

export interface AdminDashboard {
  totalUsers: number;
  totalTeachers: number;
  totalStudents: number;
  totalClassrooms: number;
  totalQuestions: number;
  totalExams: number;
  totalSubmissions: number;
  averageSystemScore: number;
  recentActivities: {
    title: string;
    description: string;
    timestampUtc: string;
    type: string;
  }[];
}

export interface TeacherDashboard {
  totalClasses: number;
  totalStudents: number;
  totalExams: number;
  totalSubmissions: number;
  overallPassRate: number;
  recentExams: {
    examId: string;
    title: string;
    classroomName: string;
    submissionsCount: number;
    averageScore: number;
    passRate: number;
    highRiskCount: number;
    endTimeUtc: string;
  }[];
}

export interface StudentDashboard {
  enrolledClassesCount: number;
  pendingExamsCount: number;
  completedExamsCount: number;
  averageScore: number;
  upcomingExams: {
    examId: string;
    title: string;
    classroomName: string;
    subjectName: string;
    durationMinutes: number;
    startTimeUtc: string;
    endTimeUtc: string;
    isOpen: boolean;
    attemptsRemaining: number;
  }[];
  recentResults: {
    sessionId: string;
    examId: string;
    examTitle: string;
    subjectName: string;
    score: number;
    maxScore: number;
    isPassed: boolean;
    submittedAtUtc: string;
  }[];
}
