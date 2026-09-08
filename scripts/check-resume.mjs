import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const resume = JSON.parse(await readFile(new URL('../src/lib/resume.json', import.meta.url), 'utf8'));
assert(resume && typeof resume === 'object' && !Array.isArray(resume), 'Le CV doit être un objet JSON.');
assert.equal(typeof resume.basics?.name, 'string', 'Renseigner basics.name.');
assert(resume.basics.name.trim(), 'basics.name ne peut pas être vide.');

for (const section of ['work', 'education', 'skills', 'projects', 'languages', 'interests']) {
  if (resume[section] === undefined) continue;
  assert(Array.isArray(resume[section]), `${section} doit être un tableau.`);
  for (const [index, item] of resume[section].entries()) {
    assert(item && typeof item === 'object' && !Array.isArray(item), `${section}[${index}] doit être un objet.`);
    for (const property of ['highlights', 'keywords']) {
      if (item[property] === undefined) continue;
      assert(Array.isArray(item[property]) && item[property].every((value) => typeof value === 'string'), `${section}[${index}].${property} doit contenir des textes.`);
    }
    for (const property of ['startDate', 'endDate']) {
      if (!item[property]) continue;
      assert(/^\d{4}(-\d{2})?(-\d{2})?$/.test(item[property]), `${section}[${index}].${property} : utiliser une date ISO.`);
    }
  }
}

if (resume.meta?.demo === true) {
  assert(resume.meta.demoNotice, 'La démonstration doit avoir un avertissement explicite.');
}
console.log('JSON lisible, nom renseigné et structure des sections affichées vérifiée.');
console.log('Ce contrôle local ne remplace pas une validation complète du schéma JSON Resume.');
