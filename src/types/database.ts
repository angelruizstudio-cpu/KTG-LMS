export type UserRole = "admin" | "instructor" | "student" | "registrar";
export type CourseStatus = "draft" | "published" | "archived";
export type LessonType = "video" | "pdf" | "text" | "assignment" | "quiz";
export type EnrollmentStatus = "active" | "completed" | "dropped";
export type AcademicStatus = "active" | "inactive" | "withdrawn" | "graduated" | "suspended";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: UserRole;
          academic_status: AcademicStatus;
          default_tenant_id: string;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: UserRole;
          academic_status?: AcademicStatus;
          default_tenant_id: string;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      tenants: {
        Row: {
          id: string;
          name: string;
          slug: string;
          code: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          code?: string;
          status?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tenants"]["Insert"]>;
      };
      tenant_memberships: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          role: UserRole;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id: string;
          role?: UserRole;
          status?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tenant_memberships"]["Insert"]>;
      };
      tenant_user_identities: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          institution_user_id: string;
          role: UserRole;
          status: string;
          issued_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id: string;
          institution_user_id: string;
          role?: UserRole;
          status?: string;
          issued_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["tenant_user_identities"]["Insert"]>;
      };
      platform_admins: {
        Row: {
          id: string;
          user_id: string;
          status: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          status?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["platform_admins"]["Insert"]>;
      };
      courses: {
        Row: {
          id: string;
          tenant_id: string;
          title: string;
          slug: string;
          description: string;
          cover_image_url: string | null;
          status: CourseStatus;
          price_cents: number;
          stripe_price_id: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          title: string;
          slug: string;
          description: string;
          cover_image_url?: string | null;
          status?: CourseStatus;
          price_cents?: number;
          stripe_price_id?: string | null;
          created_by: string;
        };
        Update: Partial<Database["public"]["Tables"]["courses"]["Insert"]>;
      };
      programs: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          slug: string;
          description: string | null;
          active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          slug: string;
          description?: string | null;
          active?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["programs"]["Insert"]>;
      };
      program_courses: {
        Row: {
          id: string;
          program_id: string;
          course_id: string;
          position: number;
          required: boolean;
          available_from: string | null;
        };
        Insert: {
          id?: string;
          program_id: string;
          course_id: string;
          position?: number;
          required?: boolean;
          available_from?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["program_courses"]["Insert"]>;
      };
      program_enrollments: {
        Row: {
          id: string;
          program_id: string;
          student_id: string;
          status: string;
          enrolled_at: string;
        };
        Insert: {
          id?: string;
          program_id: string;
          student_id: string;
          status?: string;
        };
        Update: Partial<Database["public"]["Tables"]["program_enrollments"]["Insert"]>;
      };
      course_prerequisites: {
        Row: {
          id: string;
          course_id: string;
          prerequisite_course_id: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          prerequisite_course_id: string;
        };
        Update: Partial<Database["public"]["Tables"]["course_prerequisites"]["Insert"]>;
      };
      course_modules: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          position: number;
        };
        Update: Partial<Database["public"]["Tables"]["course_modules"]["Insert"]>;
      };
      lessons: {
        Row: {
          id: string;
          module_id: string;
          title: string;
          lesson_type: LessonType;
          video_url: string | null;
          pdf_path: string | null;
          content: string | null;
          assignment_prompt: string | null;
          due_at: string | null;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          module_id: string;
          title: string;
          lesson_type?: LessonType;
          video_url?: string | null;
          pdf_path?: string | null;
          content?: string | null;
          assignment_prompt?: string | null;
          due_at?: string | null;
          position: number;
        };
        Update: Partial<Database["public"]["Tables"]["lessons"]["Insert"]>;
      };
      enrollments: {
        Row: {
          id: string;
          course_id: string;
          student_id: string;
          status: EnrollmentStatus;
          progress_percent: number;
          enrolled_at: string;
          completed_at: string | null;
          last_activity_at: string;
          inactivity_alert_sent_at: string | null;
          dropped_automatically: boolean;
        };
        Insert: {
          id?: string;
          course_id: string;
          student_id: string;
          status?: EnrollmentStatus;
          progress_percent?: number;
          completed_at?: string | null;
          last_activity_at?: string;
          inactivity_alert_sent_at?: string | null;
          dropped_automatically?: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["enrollments"]["Insert"]>;
      };
      lesson_progress: {
        Row: {
          id: string;
          lesson_id: string;
          student_id: string;
          completed: boolean;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          lesson_id: string;
          student_id: string;
          completed?: boolean;
          completed_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["lesson_progress"]["Insert"]>;
      };
      quizzes: {
        Row: {
          id: string;
          lesson_id: string;
          title: string;
          passing_score: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          lesson_id: string;
          title: string;
          passing_score?: number;
        };
        Update: Partial<Database["public"]["Tables"]["quizzes"]["Insert"]>;
      };
      quiz_questions: {
        Row: {
          id: string;
          quiz_id: string;
          prompt: string;
          choices: Json;
          correct_answer: string;
          points: number;
          position: number;
        };
        Insert: {
          id?: string;
          quiz_id: string;
          prompt: string;
          choices: Json;
          correct_answer: string;
          points?: number;
          position: number;
        };
        Update: Partial<Database["public"]["Tables"]["quiz_questions"]["Insert"]>;
      };
      quiz_attempts: {
        Row: {
          id: string;
          quiz_id: string;
          student_id: string;
          answers: Json;
          score: number;
          passed: boolean;
          submitted_at: string;
        };
        Insert: {
          id?: string;
          quiz_id: string;
          student_id: string;
          answers: Json;
          score: number;
          passed: boolean;
        };
        Update: Partial<Database["public"]["Tables"]["quiz_attempts"]["Insert"]>;
      };
      assignment_submissions: {
        Row: {
          id: string;
          lesson_id: string;
          student_id: string;
          submission_text: string;
          file_path: string | null;
          status: string;
          grade_score: number | null;
          max_score: number;
          feedback: string | null;
          submitted_at: string;
          graded_at: string | null;
        };
        Insert: {
          id?: string;
          lesson_id: string;
          student_id: string;
          submission_text: string;
          file_path?: string | null;
          status?: string;
          grade_score?: number | null;
          max_score?: number;
          feedback?: string | null;
          graded_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["assignment_submissions"]["Insert"]>;
      };
      gradebook_entries: {
        Row: {
          id: string;
          course_id: string;
          student_id: string;
          item_name: string;
          score: number;
          max_score: number;
          feedback: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          student_id: string;
          item_name: string;
          score: number;
          max_score: number;
          feedback?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["gradebook_entries"]["Insert"]>;
      };
      certificates: {
        Row: {
          id: string;
          course_id: string;
          student_id: string;
          certificate_number: string;
          issued_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          student_id: string;
          certificate_number: string;
        };
        Update: Partial<Database["public"]["Tables"]["certificates"]["Insert"]>;
      };
      finance_clearances: {
        Row: {
          id: string;
          program_id: string;
          student_id: string;
          status: string;
          notes: string | null;
          cleared_by: string | null;
          updated_at: string;
        };
        Insert: {
          id?: string;
          program_id: string;
          student_id: string;
          status?: string;
          notes?: string | null;
          cleared_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["finance_clearances"]["Insert"]>;
      };
      program_certificates: {
        Row: {
          id: string;
          program_id: string;
          student_id: string;
          certificate_number: string;
          issued_at: string;
          issued_by: string | null;
        };
        Insert: {
          id?: string;
          program_id: string;
          student_id: string;
          certificate_number: string;
          issued_by?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["program_certificates"]["Insert"]>;
      };
      course_announcements: {
        Row: {
          id: string;
          course_id: string;
          title: string;
          body: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          course_id: string;
          title: string;
          body: string;
          created_by: string;
        };
        Update: Partial<Database["public"]["Tables"]["course_announcements"]["Insert"]>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      next_institution_user_id: {
        Args: { tenant_uuid: string };
        Returns: string;
      };
    };
    Enums: {
      user_role: UserRole;
      course_status: CourseStatus;
      lesson_type: LessonType;
      enrollment_status: EnrollmentStatus;
    };
  };
}
