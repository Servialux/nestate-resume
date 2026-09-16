<script lang="ts">
  import ThemeToggle from '$lib/components/ThemeToggle.svelte';
  import { base } from '$app/paths';
  import PrintResume from '$lib/components/PrintResume.svelte';
  import { CV_PDF_PATH } from '$lib/print-resume';
  import PortfolioPhoto from '$lib/components/PortfolioPhoto.svelte';
  import { resume, isDemo, period, year, safeUrl, locationLabel } from '$lib/resume';

  const basics = resume.basics ?? {};
  const phones = [basics.phone, ...(basics.additionalPhones ?? [])].filter((phone): phone is string => Boolean(phone));
  const portrait = resume.meta?.images?.portrait;
  const projectImages = resume.meta?.images?.projects ?? {};
  const projects = resume.projects ?? [];
  // Temporarily hidden until the project selection is ready to present.
  const showProjects = false;
  const work = resume.work ?? [];
  const skills = resume.skills ?? [];
  const education = resume.education ?? [];
  const languages = resume.languages ?? [];
  const interests = resume.interests ?? [];
  const profiles = (basics.profiles ?? []).filter((profile) => safeUrl(profile.url));
  const initials = (basics.name ?? 'Mon portfolio').split(/\s+/).map((name) => name[0]).slice(0, 2).join('');
  const nameParts = (basics.name ?? 'Mon portfolio').split(' ');
  const number = (index: number) => String(index + 1).padStart(2, '0');
</script>

<svelte:head>
  <title>{basics.name ?? 'Portfolio'} — {basics.label ?? 'Développement'}{isDemo ? ' · Démonstration' : ''}</title>
  <meta name="description" content={basics.summary ?? 'Portfolio de développement et curriculum vitæ.'} />
  {#if isDemo}<meta name="robots" content="noindex, nofollow" />{/if}
</svelte:head>

<a class="skip-link" href="#contenu">Aller au contenu</a>

<div class="shell">
  <header class="site-header">
    <a class="brand" href="#accueil" aria-label="Retour à l’accueil"><span class="brand-mark">{initials}<span>.</span></span><span class="brand-caption">{basics.label}</span></a>
    <nav aria-label="Navigation principale">
      {#if work.length}<a href="#parcours">Parcours</a>{/if}
      <a href="#profil">Profil</a>
      <a href="{base}/blog">Blog</a>
      {#if showProjects && projects.length}<a href="#projets">Projets</a>{/if}
    </nav>
    <div class="header-actions">
      <ThemeToggle />
      <a class="header-cta" href="#contact">Échanger <span aria-hidden="true">↗</span></a>
    </div>
  </header>

  <main id="contenu">
    <section id="accueil" class="hero" aria-labelledby="hero-title">
      <div class="hero-topline"><span class="eyebrow"><span class="status-dot"></span>{basics.label ?? 'Développeur'}</span><span class="edition">PORTFOLIO / {isDemo ? 'DÉMO' : 'CV'}</span></div>
      <div class="hero-grid">
        <div class="hero-copy">
          <h1 id="hero-title">{nameParts[0]}<br /><span>{nameParts.slice(1).join(' ') || 'Portfolio'}<span class="name-dot">.</span></span></h1>
          <p class="hero-statement">L’IA en pratique.<br />L’expertise <em>PHP.</em></p>
          <p class="hero-summary">{basics.summary}</p>
          <div class="hero-actions">
            <a class="button primary" href="{base}{CV_PDF_PATH}" download="CV-Alexandre-Ambiehl.pdf">Télécharger le CV PDF <span aria-hidden="true">↓</span></a>
            {#if showProjects && projects.length}<a class="text-button" href="#projets">Explorer mes projets <span aria-hidden="true">↘</span></a>{/if}
            <button class="text-button print-control" onclick={() => window.print()}>Imprimer (ATS) <span aria-hidden="true">↗</span></button>
          </div>
        </div>
        <figure class="portrait-composition">
          <div class="portrait-frame">
            {#if portrait}<PortfolioPhoto image={portrait} portrait />{:else}<div class="portrait-fallback" aria-hidden="true">{initials}</div>{/if}
            {#if portrait?.illustration}<span class="portrait-label">PORTRAIT D’ILLUSTRATION</span>{/if}
            {#if resume.meta?.experienceSince}<div class="experience-badge"><strong>{resume.meta.experienceSince}</strong><span>Début de parcours<br />Systèmes, développement & architecture</span></div>{/if}
          </div>
          {#if portrait}<figcaption class="portrait-credit">
            {#if portrait.illustration}Photo provisoire — ce modèle n’est pas le propriétaire du portfolio.<br />{/if}
            {#if safeUrl(portrait.source)}Photo : <a href={safeUrl(portrait.source)} target="_blank" rel="noreferrer">{portrait.photographer ?? 'Source'}<span class="sr-only"> (nouvel onglet)</span></a>{/if}
          </figcaption>{/if}
        </figure>
      </div>
    </section>

    {#if isDemo}<aside class="demo-notice"><span class="demo-label">MODE DÉMO</span><p>{resume.meta?.demoNotice ?? 'Profil de démonstration : les informations affichées sont fictives.'}</p></aside>{/if}

    {#if work.length}
      <section id="parcours" class="section" aria-labelledby="work-title"><div class="section-heading"><div><span class="eyebrow section-kicker">01 / PARCOURS</span><h2 id="work-title">Apprendre.<br /><span>Puis aller plus loin.</span></h2></div>{#if isDemo}<p>Un exemple de parcours pour vous projeter. Les expériences ci-dessous sont fictives.</p>{/if}</div>
        <div class="timeline">
          {#each work as job}
            <article class="timeline-item">
              <div class="timeline-period">{period(job.startDate, job.endDate)}{#if job.startDate && !job.endDate}<span class="current-label">{isDemo ? 'ACTUEL · EXEMPLE' : 'ACTUEL'}</span>{/if}</div>
              <div class="timeline-body">
                <h3>{job.position}</h3><p class="company">{job.name}</p><p>{job.summary}</p>
                <ul>{#each job.highlights ?? [] as highlight}<li>{highlight}</li>{/each}</ul>
                {#if job.keywords?.length}
                  <ul class="tags" aria-label="Technologies utilisées chez {job.name}">{#each job.keywords as keyword}<li>{keyword}</li>{/each}</ul>
                {/if}
                {#if job.secondaryKeywords?.length}
                  <details class="secondary-technologies"><summary>Autres technologies utilisées</summary><ul class="tags" aria-label="Autres technologies utilisées chez {job.name}">{#each job.secondaryKeywords as keyword}<li>{keyword}</li>{/each}</ul></details>
                {/if}
                {#if job.missions?.length}
                  <div class="mission-list">
                    <p class="mission-notice">Les clients sont désignés par leur secteur d’activité pour respecter la confidentialité des missions.</p>
                    {#each job.missions as mission}
                      <section class="mission">
                        <p class="mission-label">{mission.label}</p>
                        <h4>{mission.name}</h4>
                        <p>{mission.summary}</p>
                        <ul>{#each mission.highlights ?? [] as highlight}<li>{highlight}</li>{/each}</ul>
                        <ul class="tags" aria-label="Compétences mobilisées">{#each mission.keywords ?? [] as keyword}<li>{keyword}</li>{/each}</ul>
                      </section>
                    {/each}
                  </div>
                {/if}
              </div>
              <span class="timeline-arrow" aria-hidden="true">↗</span>
            </article>
          {/each}
        </div>
      </section>
    {/if}

    <section id="profil" class="section profile-section" aria-labelledby="profile-title">
      <div class="profile-intro"><span class="eyebrow section-kicker">02 / PROFIL & COMPÉTENCES</span><h2 id="profile-title">Compétences<br /><span>techniques.</span></h2><p>Mon objectif est d’évoluer vers un poste d’architecte logiciel spécialisé en IA, tout en continuant à coder. Je m’appuie sur mon expertise PHP/Symfony, mon expérience de responsable R&D et mes réalisations en IA pour concevoir des solutions adaptées aux besoins des équipes.</p><a class="inline-link" href="{base}/resume.json" download="resume.json">Télécharger le JSON Resume <span aria-hidden="true">↓</span></a></div>
      <div class="skill-groups">
        {#each skills as skill, index}
          <div class="skill-group">
            <div class="skill-heading"><span class="mono">{number(index)}</span><h3>{skill.name}</h3></div>
            {#if skill.summary}<p class="skill-summary">{skill.summary}</p>{/if}
            <ul class="skill-list">{#each skill.keywords ?? [] as keyword}<li>{keyword}</li>{/each}</ul>
            {#if skill.secondaryKeywords?.length}
              <details class="secondary-technologies"><summary>Expériences complémentaires</summary><ul class="skill-list">{#each skill.secondaryKeywords as keyword}<li>{keyword}</li>{/each}</ul></details>
            {/if}
          </div>
        {/each}
      </div>
    </section>

    {#if showProjects && projects.length}
      <section id="projets" class="section" aria-labelledby="projects-title">
        <div class="section-heading"><div><span class="eyebrow section-kicker">03 / SÉLECTION</span><h2 id="projects-title">Réalisations.<br /><span>Et explorations.</span></h2></div><p>Agent de développement IA, applications web et objets connectés. Les missions confidentielles sont présentées sans nom de client ni détail interne.</p></div>
        <div class="projects-grid">
          {#each projects as project, index}
            {@const projectImage = projectImages[project.name ?? '']}
            <article class="project-card" class:featured={index === 0}>
              <div class="project-art">
                {#if projectImage}<PortfolioPhoto image={projectImage} />{/if}
                <span class="art-caption">{project.name}</span>
                {#if projectImage?.illustration}<span class="photo-kind">Photographie d’illustration</span>{/if}
                <span class="art-number" aria-hidden="true">{number(index)}</span>
              </div>
              {#if projectImage && safeUrl(projectImage.source)}<p class="image-credit">Photo : <a href={safeUrl(projectImage.source)} target="_blank" rel="noreferrer">{projectImage.photographer ?? 'Source'}<span class="sr-only"> (nouvel onglet)</span></a></p>{/if}
              <div class="project-content"><div class="project-meta"><span>{project.type ?? 'Projet'}</span><span>{year(project.endDate ?? project.startDate)}</span></div><h3>{project.name}</h3><p>{project.description}</p><ul class="tags" aria-label="Technologies">{#each project.keywords ?? [] as keyword}<li>{keyword}</li>{/each}</ul>
                {#if project.highlights?.length}<details><summary>Dans les détails <span class="details-plus" aria-hidden="true">+</span></summary><ul class="project-details">{#each project.highlights as highlight}<li>{highlight}</li>{/each}</ul></details>{/if}
                {#if safeUrl(project.url)}<a class="project-link" href={safeUrl(project.url)} target="_blank" rel="noreferrer">Voir le projet <span aria-hidden="true">↗</span><span class="sr-only"> (nouvel onglet)</span></a>{/if}
              </div>
            </article>
          {/each}
        </div>
      </section>
    {/if}

    {#if education.length || languages.length || interests.length}
      <div class="additional-info">
        {#if education.length}<section aria-labelledby="education-title"><h2 id="education-title" class="eyebrow">FORMATION</h2>{#if resume.meta?.educationSummary}<p>{resume.meta.educationSummary}</p>{/if}{#each education as item}<h3>{item.area}</h3><p>{item.studyType} · {year(item.endDate)}</p><p>{item.institution}</p>{/each}</section>{/if}
        {#if languages.length}<section aria-labelledby="languages-title"><h2 id="languages-title" class="eyebrow">LANGUES</h2>{#each languages as language}<p class="language"><strong>{language.language}</strong><span>{language.fluency}</span></p>{/each}</section>{/if}
        {#if interests.length}<section aria-labelledby="interests-title"><h2 id="interests-title" class="eyebrow">CENTRES D’INTÉRÊT</h2>{#each interests as interest}<h3>{interest.name}</h3>{#if interest.keywords?.length}<p>{interest.keywords.join(' · ')}</p>{/if}{/each}</section>{/if}
      </div>
    {/if}

    <section id="contact" class="contact-section" aria-labelledby="contact-title"><span class="eyebrow">LA SUITE S’ÉCRIT À PLUSIEURS</span><div class="contact-heading"><h2 id="contact-title">Parlons de votre<br /><em>prochain projet.</em></h2><span class="contact-arrow" aria-hidden="true">↗</span></div><div class="contact-details">
      {#if phones.length}<div><h3>Téléphone</h3>{#each phones as phone}<p><a href="tel:{phone.replace(/[^+0-9]/g, '')}">{phone}</a></p>{/each}</div>{/if}
      {#if locationLabel(basics.location)}<div><h3>Localisation</h3><p>{locationLabel(basics.location)}</p></div>{/if}
    </div><div class="contact-bottom">{#if basics.email}<a class="button dark" href="mailto:{basics.email}">{basics.email} <span aria-hidden="true">↗</span></a>{:else}<p>{isDemo ? 'Coordonnées à personnaliser dans cette démonstration.' : 'Coordonnées non renseignées.'}</p>{/if}<div class="social-links"><a href="{base}{CV_PDF_PATH}" download="CV-Alexandre-Ambiehl.pdf">CV PDF ↓</a>{#each profiles as profile}<a href={safeUrl(profile.url)} target="_blank" rel="noreferrer">{profile.network ?? 'Profil'} ↗<span class="sr-only"> (nouvel onglet)</span></a>{/each}<button class="text-button print-control" onclick={() => window.print()}>Imprimer (ATS) ↗</button></div></div></section>
  </main>
  <footer><span>{basics.name} <span class="footer-dot">/</span> {isDemo ? 'Portfolio de démonstration' : basics.label}</span><a href="{base}/connexion">Espace auteur</a><a href="#accueil">Retour en haut ↑</a></footer>
</div>

<PrintResume />
