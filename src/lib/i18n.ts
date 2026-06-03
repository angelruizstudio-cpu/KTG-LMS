import { cookies } from "next/headers";

export type AppLanguage = "en" | "es" | "zh";

export const languageCookieName = "dosis_lang";

export const languages: Record<AppLanguage, { flag: string; label: string; shortLabel: string }> = {
  es: { flag: "🇵🇷", label: "Español", shortLabel: "ES" },
  en: { flag: "🇺🇸", label: "English", shortLabel: "EN" },
  zh: { flag: "🇨🇳", label: "中文", shortLabel: "中文" }
};

export async function getLanguage(): Promise<AppLanguage> {
  const cookieStore = await cookies();
  const value = cookieStore.get(languageCookieName)?.value;
  return value === "en" || value === "es" || value === "zh" ? value : "es";
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
      finance: "Finance",
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
      learnerCardTitle: "Assigned learning paths",
      learnerCardText: "Students access the exact programs and courses their institution makes available.",
      navAbout: "About Us",
      proofCourses: "Program-based courses",
      proofFinance: "Finance clearance",
      proofTenant: "Institution portals",
      requestDemo: "Request Demo",
      searchButton: "Students and Educators",
      sectionEyebrow: "Built for institution-led learning",
      sectionTitle: "One LMS for programs, courses, progress, and certificates.",
      sectionText:
        "Dosis Educa helps institutions assign learning paths, manage prerequisites, support instructors, and verify completion before certificates are issued.",
      subtitle:
        "Access assigned courses, programs, grades, and certificates through your institution portal, or bring your institution online with a guided LMS demo."
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
      finance: "Finanzas",
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
      learnerCardTitle: "Rutas académicas asignadas",
      learnerCardText: "Los estudiantes acceden a los programas y cursos que su institución habilita.",
      navAbout: "Sobre Nosotros",
      proofCourses: "Cursos por programa",
      proofFinance: "Validación de finanzas",
      proofTenant: "Portales institucionales",
      requestDemo: "Solicitar Demo",
      searchButton: "Estudiantes y Educadores",
      sectionEyebrow: "Diseñado para aprendizaje institucional",
      sectionTitle: "Un LMS para programas, cursos, progreso y certificados.",
      sectionText:
        "Dosis Educa ayuda a las instituciones a asignar rutas académicas, manejar prerrequisitos, apoyar instructores y verificar la culminación antes de emitir certificados.",
      subtitle:
        "Accede a cursos, programas, calificaciones y certificados desde el portal de tu institución, o lleva tu institución en línea con un demo guiado del LMS."
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
  },
  zh: {
    common: {
      backToInstitutionLogin: "返回机构登录",
      backToPlatformLogin: "返回平台登录",
      certificates: "证书",
      courses: "课程",
      dashboard: "仪表板",
      forgotPassword: "忘记密码？",
      finance: "财务",
      gradebook: "成绩册",
      institutionLogin: "机构登录",
      platformAdmin: "平台管理员",
      programCourses: "项目课程",
      programs: "项目",
      settings: "设置",
      signOut: "退出登录",
      users: "用户"
    },
    home: {
      accessHelp: "访问帮助",
      adminButton: "平台管理员",
      badge: "由机构管理的学习门户",
      headline: "Dosis Educa",
      institutionLogin: "机构登录",
      learnerCardTitle: "指定学习路径",
      learnerCardText: "学生访问机构开放的项目和课程。",
      navAbout: "关于我们",
      proofCourses: "项目课程",
      proofFinance: "财务审核",
      proofTenant: "机构门户",
      requestDemo: "申请演示",
      searchButton: "学生与教育者",
      sectionEyebrow: "为机构学习而建",
      sectionTitle: "一个 LMS 管理项目、课程、进度和证书。",
      sectionText: "Dosis Educa 帮助机构分配学习路径、管理先修要求、支持教师，并在颁发证书前验证完成情况。",
      subtitle: "通过你的机构门户访问课程、项目、成绩和证书，或为你的机构预约 LMS 演示。"
    },
    institutionAccess: {
      empty: "没有找到匹配的机构。",
      heading: "学生与教育者",
      loading: "正在搜索...",
      previewItems: ["项目课程", "先修课程访问", "财务审核"],
      previewTitle: "项目仪表板",
      previewType: "学生门户",
      searchLabel: "搜索机构",
      searchPlaceholder: "输入机构名称",
      subtitle: "搜索你的机构并选择它，即可进入对应机构的登录页面。"
    },
    auth: {
      confirmPassword: "确认密码",
      createNewPassword: "创建新密码",
      email: "电子邮件",
      forgotDescription: "我们会向该账号绑定的邮箱发送安全的密码恢复链接。",
      institutionId: "机构 ID",
      institutionUsers: "机构用户",
      institutionUsersDescription: "学生、教师和机构管理员使用自己的机构 ID。",
      login: "登录",
      loginDescription: "使用机构发放给你的 ID 继续。",
      needAccess: "需要访问权限？请联系你的机构管理员。",
      newPassword: "新密码",
      password: "密码",
      platformAdmins: "平台管理员",
      platformAdminsDescription: "平台管理员使用分配给平台账号的电子邮件。",
      platformDescription: "管理 LMS 机构、平台访问权限和全局设置。",
      requestNewLink: "申请新的重置链接",
      resetExpired: "此重置会话不存在或已过期。请申请新的密码重置链接。",
      resetPassword: "重置密码",
      resetSent: "如果该账号存在，我们会发送密码重置邮件。",
      sendResetLink: "发送重置链接",
      updatePassword: "更新密码"
    },
    dashboard: {
      adminOverview: "概览",
      instructorOverview: "概览",
      myLearning: "我的学习",
      profileRoleAdmin: "管理员",
      profileRoleInstructor: "教师",
      profileRoleStudent: "学生"
    }
  }
} as const;

export async function getDictionary() {
  const language = await getLanguage();
  return { language, t: dictionary[language] };
}
