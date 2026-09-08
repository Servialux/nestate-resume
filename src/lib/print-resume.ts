import { locationLabel, type Resume } from './resume.ts';

export const CV_PDF_PATH = '/cv/alexandre-ambiehl.pdf';

// Every interpolated resume value is escaped: the same markup is used by
// native printing and by the downloadable PDF generator.
const escape = (value?: string) => (value ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
const join = (items?: string[]) => (items ?? []).map(escape).join(' · ');
const bullets = (items?: string[]) => items?.length ? `<ul>${items.map((item) => `<li>${escape(item)}</li>`).join('')}</ul>` : '';
const month = (date?: string) => date ? new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${date.slice(0, 7)}-01`)) : 'Aujourd’hui';
const dates = (start?: string, end?: string) => `${month(start)} – ${month(end)}`;

type Job = NonNullable<Resume['work']>[number];
function mission(value: NonNullable<Job['missions']>[number]) {
  return `<section class="cv-mission"><h3>${escape(value.name)}</h3><p class="cv-meta">${escape(value.label)}</p><p>${escape(value.summary)}</p>${bullets(value.highlights)}<p class="cv-stack">${join(value.keywords)}</p></section>`;
}
function job(value: Job) {
  return `<section class="cv-job"><h3>${escape(value.name)} — ${escape(value.position)}</h3><p class="cv-meta">${dates(value.startDate, value.endDate)}</p><p>${escape(value.summary)}</p>${bullets(value.highlights)}${value.keywords?.length ? `<p class="cv-stack">${join(value.keywords)}</p>` : ''}</section>`;
}

export function renderPrintResume(resume: Resume, variant: 'ats' | 'designed' = 'ats') {
  const b = resume.basics ?? {};
  const work = resume.work ?? [];
  const current = work[0];
  const firstMission = current?.missions?.[0];
  const otherMissions = current?.missions?.slice(1) ?? [];
  const phones = [b.phone, ...(b.additionalPhones ?? [])].filter((phone): phone is string => Boolean(phone));
  const contact = [b.email ? `<a href="mailto:${escape(b.email)}">${escape(b.email)}</a>` : '', ...phones.map((phone) => `<a href="tel:${phone.replace(/[^+0-9]/g, '')}">${escape(phone)}</a>`)].filter(Boolean).join(' · ');
  const images = Object.values(resume.meta?.images?.projects ?? {});
  function banner(index: number) {
    if (variant !== 'designed') return '';
    const photo = images[index];
    return photo?.src.startsWith('/images/') && !photo.src.includes('..') ? `<div class="cv-photo" style="background-image:url('${escape(photo.src)}')"></div>` : '';
  }
  function footer(index: number) {
    const photo = images[index];
    const credit = variant === 'designed' && photo ? `Illustration : ${escape(photo.photographer)} / Unsplash` : '';
    return `<div class="cv-footer"><span>${credit}</span><span>${index + 1} / 3</span></div>`;
  }
  function miniHeader(title: string) {
    return `<header class="cv-running"><strong>${escape(b.name)}</strong><span>${title}</span></header>`;
  }
  return `<article class="cv-document cv-${variant}" aria-label="CV imprimable de ${escape(b.name)}">
    <div class="cv-page">
      ${banner(0)}
      <header class="cv-heading"><p class="cv-overline">CURRICULUM VITÆ</p><h1>${escape(b.name)}</h1><p class="cv-title">${escape(b.label)}</p><p class="cv-contact">${contact}</p><p class="cv-contact">${escape(locationLabel(b.location))}</p></header>
      <section><h2>Profil</h2><p>${escape(b.summary)}</p></section>
      <section><h2>Expérience professionnelle</h2>${current ? job(current) : ''}${firstMission ? mission(firstMission) : ''}</section>
      ${current?.missions?.length ? '<p class="cv-confidential">Clients désignés par leur secteur d’activité pour respecter la confidentialité des missions.</p>' : ''}
      ${footer(0)}
    </div>
    <div class="cv-page">
      ${banner(1)}${miniHeader('Parcours professionnel')}
      ${otherMissions.length ? `<section><h2>${escape(current?.name)} — Autres missions</h2>${otherMissions.map(mission).join('')}</section>` : ''}
      <section><h2>Expériences précédentes</h2>${work.slice(1).map(job).join('')}</section>
      ${footer(1)}
    </div>
    <div class="cv-page">
      ${banner(2)}${miniHeader('Compétences & informations complémentaires')}
      <section><h2>Compétences techniques</h2>${(resume.skills ?? []).map((skill) => `<section class="cv-skill"><h3>${escape(skill.name)}</h3>${skill.summary ? `<p>${escape(skill.summary)}</p>` : ''}<p><strong>${join(skill.keywords)}</strong></p>${skill.secondaryKeywords?.length ? `<p class="cv-secondary">Compléments : ${join(skill.secondaryKeywords)}</p>` : ''}</section>`).join('')}</section>
      <section class="cv-personal"><h2>Formation</h2>${resume.meta?.educationSummary ? `<p>${escape(resume.meta.educationSummary)}</p>` : ''}${(resume.education ?? []).map((item) => `<p>${escape(item.startDate?.slice(0, 4))}–${escape(item.endDate?.slice(0, 4))} · ${escape(item.studyType)} ${escape(item.area)} — ${escape(item.institution)}</p>`).join('')}<h2>Langues</h2><p>${(resume.languages ?? []).map((language) => `<strong>${escape(language.language)}</strong> : ${escape(language.fluency)}`).join(' · ')}</p><h2>Centres d’intérêt</h2><p>${(resume.interests ?? []).map((interest) => `${escape(interest.name)}${interest.keywords?.length ? ` — ${join(interest.keywords)}` : ''}`).join(' · ')}</p></section>
      ${footer(2)}
    </div>
  </article>`;
}
