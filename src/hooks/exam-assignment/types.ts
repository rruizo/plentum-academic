
export interface User {
  id: string;
  email: string;
  full_name: string;
  company: string;
  area: string;
  section: string;
  role: string;
  can_login: boolean;
  access_restricted: boolean;
}

export interface AssignmentResult {
  success: boolean;
  userId: string;
  userName: string;
  userEmail: string;
  error?: string;
  assignmentId?: string;
  notificationId?: string;
  resendId?: string;
  requiresManualDelivery?: boolean;
  manualDeliveryInstructions?: string;
}

export interface ManualDeliveryUser {
  instructions: string;
  userName: string;
  userEmail: string;
  assignmentId: string;
}

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}
