import { cookies } from "next/headers";

export type AppLanguage = "en" | "es";

export const languageCookieName = "dosis_lang";

export const languages: Record<AppLanguage, { flag: string; label: string; shortLabel: string }> = {
  es: { flag: "🇵🇷", label: "Español", shortLabel: "ES" },
  en: { flag: "🇺🇸", label: "English", shortLabel: "EN" }
};

export async function getLanguage(): Promise<AppLanguage> {
  const cookieStore = await cookies();
  const value = cookieStore.get(languageCookieName)?.value;
  return value === "en" || value === "es" ? value : "es";
}

export const dictionary = {
  en: {
    common: {
      backToInstitutionLogin: "Back to institution login",
      backToPlatformLogin: "Back to platform login",
      certificates: "Certificates",
      courses: "Courses",
      dashboard: "Dashboard",
      forgotPassword: "Forgot your password?",
      gradebook: "Gradebook",
      institutionLogin: "Institution login",
      platformAdmin: "Platform Administrator",
      programCourses: "Program courses",
      programs: "Programs",
      settings: "Settings",
      signOut: "Sign out",
      users: "Users"
    },
    home: {
      accessHelp: "Access Help",
      adminButton: "Platform Administrator",
      badge: "Institution-managed learning portal",
      headline: "Dosis Educa",
      institutionLogin: "Institution Login",
      navAbout: "About Us",
      searchButton: "Students and Educators",
      subtitle:
        "Access your assigned courses, programs, grades, and certificates through the institution ID issued by your school."
    },
    institutionAccess: {
      empty: "No matching institutions found.",
      heading: "Students and Educators",
      loading: "Searching...",
      previewItems: ["Program courses", "Prerequisite access", "Finance clearance"],
      previewTitle: "Program Dashboard",
      previewType: "Student Portal",
      searchLabel: "Search School/District",
      searchPlaceholder: "Search institution",
      subtitle: "Search for your school and select it to access that institution's login page."
    },
    auth: {
      confirmPassword: "Confirm password",
      createNewPassword: "Create new password",
      email: "Email",
      forgotDescription: "We will send a secure recovery link to the email connected to the account.",
      institutionId: "Institution ID",
      institutionUsers: "Institution users",
      institutionUsersDescription: "Students, instructors, and institution admins use their institution ID.",
      login: "Log in",
      loginDescription: "Use the ID issued by your institution to continue.",
      needAccess: "Need access? Contact your institution administrator.",
      newPassword: "New password",
      password: "Password",
      platformAdmins: "Platform administrators",
      platformAdminsDescription: "Platform admins use the email assigned to their platform account.",
      platformDescription: "Manage LMS institutions, platform access, and global setup.",
      requestNewLink: "Request a new reset link",
      resetExpired: "This reset session is missing or expired. Request a new password reset link.",
      resetPassword: "Reset password",
      resetSent: "If the account exists, a password reset email has been sent.",
      sendResetLink: "Send reset link",
      updatePassword: "Update password"
    },
    dashboard: {
      adminOverview: "Overview",
      instructorOverview: "Overview",
      myLearning: "My learning",
      profileRoleAdmin: "Admin",
      profileRoleInstructor: "Instructor",
      profileRoleStudent: "Student"
    }
  },
  es: {
    common: {
      backToInstitutionLogin: "Volver al login institucional",
      backToPlatformLogin: "Volver al login de plataforma",
      certificates: "Certificados",
      courses: "Cursos",
      dashboard: "Panel",
      forgotPassword: "¿Olvidaste tu contraseña?",
      gradebook: "Calificaciones",
      institutionLogin: "Login institucional",
      platformAdmin: "Administrador de plataforma",
      programCourses: "Cursos del programa",
      programs: "Programas",
      settings: "Configuración",
      signOut: "Cerrar sesión",
      users: "Usuarios"
    },
    home: {
      accessHelp: "Ayuda de acceso",
      adminButton: "Administrador de plataforma",
      badge: "Portal académico administrado por institución",
      headline: "Dosis Educa",
      institutionLogin: "Login institucional",
      navAbout: "Sobre Nosotros",
      searchButton: "Estudiantes y Educadores",
      subtitle:
        "Accede a tus cursos asignados, programas, calificaciones y certificados usando el ID institucional emitido por tu escuela."
    },
    institutionAccess: {
      empty: "No encontramos instituciones con ese nombre.",
      heading: "Estudiantes y Educadores",
      loading: "Buscando...",
      previewItems: ["Cursos del programa", "Acceso por prerrequisitos", "Validación de finanzas"],
      previewTitle: "Panel del Programa",
      previewType: "Portal Estudiantil",
      searchLabel: "Buscar institución",
      searchPlaceholder: "Nombre de la institución",
      subtitle: "Busca tu institución y selecciónala para entrar al login correspondiente."
    },
    auth: {
      confirmPassword: "Confirmar contraseña",
      createNewPassword: "Crear nueva contraseña",
      email: "Correo electrónico",
      forgotDescription: "Enviaremos un enlace seguro de recuperación al correo conectado a la cuenta.",
      institutionId: "ID institucional",
      institutionUsers: "Usuarios institucionales",
      institutionUsersDescription: "Estudiantes, instructores y administradores institucionales usan su ID institucional.",
      login: "Entrar",
      loginDescription: "Usa el ID emitido por tu institución para continuar.",
      needAccess: "¿Necesitas acceso? Contacta al administrador de tu institución.",
      newPassword: "Nueva contraseña",
      password: "Contraseña",
      platformAdmins: "Administradores de plataforma",
      platformAdminsDescription: "Los administradores de plataforma usan el correo asignado a su cuenta.",
      platformDescription: "Administra instituciones, accesos de plataforma y configuración global del LMS.",
      requestNewLink: "Solicitar un nuevo enlace",
      resetExpired: "Esta sesión de recuperación no existe o expiró. Solicita un nuevo enlace.",
      resetPassword: "Restablecer contraseña",
      resetSent: "Si la cuenta existe, enviaremos un correo para restablecer la contraseña.",
      sendResetLink: "Enviar enlace",
      updatePassword: "Actualizar contraseña"
    },
    dashboard: {
      adminOverview: "Resumen",
      instructorOverview: "Resumen",
      myLearning: "Mi aprendizaje",
      profileRoleAdmin: "Admin",
      profileRoleInstructor: "Instructor",
      profileRoleStudent: "Estudiante"
    }
  }
} as const;

export async function getDictionary() {
  const language = await getLanguage();
  return { language, t: dictionary[language] };
}
