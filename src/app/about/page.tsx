import { BookOpenCheck, Building2, GraduationCap, HeartHandshake, ShieldCheck, UsersRound } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { BrandLogo } from "@/components/brand-logo";
import { LanguageSwitcher } from "@/components/language-switcher";
import { LinkButton } from "@/components/ui/link-button";
import { getDictionary, type AppLanguage } from "@/lib/i18n";

function getAboutCopy(language: AppLanguage) {
  const values: Record<AppLanguage, {
    cta: string;
    ctaDescription: string;
    ctaTitle: string;
    eyebrow: string;
    hero: string;
    intro: string;
    mainButton: string;
    navAbout: string;
    platformAdmin: string;
    sectionDescription: string;
    sectionTitle: string;
    overviewItems: Array<{ description: string; title: string }>;
    values: Array<{ description: string; Icon: LucideIcon; title: string }>;
  }> = {
    es: {
      cta: "Acceder al login institucional",
      ctaDescription: "Cada institución tiene su propio portal, sus usuarios, sus programas y sus certificados.",
      ctaTitle: "Educación organizada para cada institución",
      eyebrow: "Sobre Nosotros",
      hero: "Nuestra Misión",
      intro:
        "Dosis Educa existe para ayudar a instituciones educativas a ofrecer formación organizada, accesible y segura. Nuestra plataforma conecta estudiantes, instructores y administradores en un entorno académico diseñado para completar programas, medir progreso y emitir certificados con confianza.",
      mainButton: "Ir al portal principal",
      navAbout: "Sobre Nosotros",
      platformAdmin: "Platform Admin",
      sectionDescription:
        "La plataforma fue pensada para organizaciones que necesitan administrar programas académicos, controlar acceso por prerrequisitos, validar finanzas antes de certificar y mantener la experiencia del estudiante sencilla.",
      sectionTitle: "Un LMS para instituciones con propósito",
      overviewItems: [
        {
          title: "Nuestra Misión",
          description:
            "Equipar instituciones, instructores y estudiantes con una plataforma educativa clara, segura y centrada en el progreso académico."
        },
        {
          title: "Nuestra Visión",
          description:
            "Ser un ecosistema de aprendizaje que ayude a cada estudiante a completar su programa con estructura, acompañamiento y evidencia de logro."
        },
        {
          title: "Nuestro Compromiso",
          description:
            "Construir tecnología confiable para administrar cursos, matrículas, calificaciones, finanzas y certificados con integridad."
        }
      ],
      values: [
        { title: "Acceso institucional", description: "Cada estudiante entra por su institución y su ID académico.", Icon: Building2 },
        { title: "Formación organizada", description: "Programas, cursos, módulos y prerrequisitos en un flujo claro.", Icon: BookOpenCheck },
        { title: "Acompañamiento", description: "Administradores e instructores tienen herramientas para guiar al estudiante.", Icon: UsersRound },
        { title: "Seguridad", description: "Cada institución mantiene sus datos separados mediante permisos y tenant system.", Icon: ShieldCheck },
        { title: "Progreso medible", description: "El estudiante puede ver cursos, avances, notas y certificados.", Icon: GraduationCap },
        { title: "Servicio", description: "Diseñado para apoyar educación con propósito, orden y excelencia.", Icon: HeartHandshake }
      ]
    },
    en: {
      cta: "Go to institution login",
      ctaDescription: "Each institution has its own portal, users, programs, and certificates.",
      ctaTitle: "Organized education for every institution",
      eyebrow: "About Us",
      hero: "Our Mission",
      intro:
        "Dosis Educa helps educational institutions deliver organized, accessible, and secure learning. The platform connects students, instructors, and administrators in an academic environment designed to complete programs, measure progress, and issue certificates with confidence.",
      mainButton: "Go to main portal",
      navAbout: "About Us",
      platformAdmin: "Platform Admin",
      sectionDescription:
        "The platform is designed for organizations that need to manage academic programs, control access through prerequisites, validate finance clearance before certification, and keep the student experience simple.",
      sectionTitle: "An LMS for purpose-driven institutions",
      overviewItems: [
        {
          title: "Our Mission",
          description: "Equip institutions, instructors, and students with a clear, secure learning platform centered on academic progress."
        },
        {
          title: "Our Vision",
          description: "Build a learning ecosystem that helps every student complete their program with structure, guidance, and evidence of achievement."
        },
        {
          title: "Our Commitment",
          description: "Create reliable technology for managing courses, enrollments, grades, finance clearance, and certificates with integrity."
        }
      ],
      values: [
        { title: "Institution access", description: "Each student enters through their institution and academic ID.", Icon: Building2 },
        { title: "Organized learning", description: "Programs, courses, modules, and prerequisites in one clear flow.", Icon: BookOpenCheck },
        { title: "Guidance", description: "Admins and instructors have tools to guide each student.", Icon: UsersRound },
        { title: "Security", description: "Each institution keeps its data separated through permissions and tenant isolation.", Icon: ShieldCheck },
        { title: "Measurable progress", description: "Students can see courses, progress, grades, and certificates.", Icon: GraduationCap },
        { title: "Service", description: "Designed to support purposeful education with order and excellence.", Icon: HeartHandshake }
      ]
    },
    zh: {
      cta: "进入机构登录",
      ctaDescription: "每个机构都有自己的门户、用户、项目和证书。",
      ctaTitle: "为每个机构提供有序的教育体验",
      eyebrow: "关于我们",
      hero: "我们的使命",
      intro:
        "Dosis Educa 帮助教育机构提供有组织、易访问且安全的学习体验。平台将学生、教师和管理员连接在一个学术环境中，支持项目完成、进度追踪和证书颁发。",
      mainButton: "返回主门户",
      navAbout: "关于我们",
      platformAdmin: "平台管理员",
      sectionDescription:
        "该平台专为需要管理学术项目、通过先修课程控制访问、在认证前验证财务状态，并保持学生体验简单清晰的机构而设计。",
      sectionTitle: "面向使命型机构的 LMS",
      overviewItems: [
        {
          title: "我们的使命",
          description: "为机构、教师和学生提供清晰、安全、以学术进步为中心的学习平台。"
        },
        {
          title: "我们的愿景",
          description: "建立一个学习生态系统，帮助每位学生在结构、指导和成果证明中完成自己的项目。"
        },
        {
          title: "我们的承诺",
          description: "以诚信打造可靠技术，用于管理课程、注册、成绩、财务审核和证书。"
        }
      ],
      values: [
        { title: "机构访问", description: "每位学生都通过所属机构和学术 ID 登录。", Icon: Building2 },
        { title: "有序学习", description: "项目、课程、模块和先修要求都在一个清晰流程中。", Icon: BookOpenCheck },
        { title: "学习指导", description: "管理员和教师拥有工具来指导学生。", Icon: UsersRound },
        { title: "安全", description: "每个机构通过权限和租户隔离保持数据独立。", Icon: ShieldCheck },
        { title: "可衡量进度", description: "学生可以查看课程、进度、成绩和证书。", Icon: GraduationCap },
        { title: "服务", description: "旨在以秩序和卓越支持有使命的教育。", Icon: HeartHandshake }
      ]
    }
  };

  return values[language];
}

export default async function AboutPage() {
  const { language, t } = await getDictionary();
  const copy = getAboutCopy(language);

  return (
    <main className="min-h-screen bg-background text-text-primary">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-5 sm:px-8">
          <Link href="/">
            <BrandLogo />
          </Link>
          <nav className="hidden items-center gap-8 text-sm font-semibold text-text-primary md:flex">
            <Link className="text-primary-hover" href="/about">
              {copy.navAbout}
            </Link>
            <Link className="transition hover:text-primary-hover" href="/auth/login">
              {t.common.institutionLogin}
            </Link>
            <Link className="transition hover:text-primary-hover" href="/platform/login">
              {copy.platformAdmin}
            </Link>
            <LanguageSwitcher currentPath="/about" language={language} />
          </nav>
        </div>
      </header>

      <section className="bg-surface">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-20">
          <div className="max-w-4xl">
            <p className="text-sm font-black uppercase tracking-wide text-primary-hover">{copy.eyebrow}</p>
            <h1 className="mt-4 text-5xl font-black leading-tight text-text-primary sm:text-6xl">{copy.hero}</h1>
            <p className="mt-6 max-w-3xl text-lg font-medium leading-8 text-text-secondary">{copy.intro}</p>
          </div>

          <div className="mt-12 h-px bg-border" />

          <div className="mt-8 grid gap-8 md:grid-cols-3">
            {copy.overviewItems.map((item) => (
              <article key={item.title}>
                <h2 className="text-xl font-black text-text-primary">{item.title}</h2>
                <p className="mt-3 text-base font-medium leading-7 text-text-secondary">{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:py-16">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div>
            <h2 className="text-3xl font-black text-text-primary">{copy.sectionTitle}</h2>
            <p className="mt-4 text-base font-medium leading-7 text-text-secondary">{copy.sectionDescription}</p>
            <LinkButton className="mt-8" href="/" size="lg">
              {copy.mainButton}
            </LinkButton>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {copy.values.map(({ description, Icon, title }) => (
              <article className="rounded-2xl border border-border bg-surface p-5 shadow-soft" key={title}>
                <span className="grid size-11 place-items-center rounded-2xl bg-secondary-light text-secondary-hover">
                  <Icon size={22} />
                </span>
                <h3 className="mt-5 font-black text-text-primary">{title}</h3>
                <p className="mt-2 text-sm font-medium leading-6 text-text-secondary">{description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-sidebar text-text-inverse">
        <div className="mx-auto grid max-w-7xl gap-6 px-5 py-12 sm:px-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-3xl font-black">{copy.ctaTitle}</h2>
            <p className="mt-3 max-w-2xl text-text-inverse/75">{copy.ctaDescription}</p>
          </div>
          <LinkButton className="bg-primary hover:bg-primary-hover" href="/auth/login" size="lg">
            {copy.cta}
          </LinkButton>
        </div>
      </section>
    </main>
  );
}
