import { emitKeypressEvents } from 'node:readline';
import { createInterface as createPrompt } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { createAdmin } from '../src/lib/server/auth.ts';

/** @param {string} question @returns {Promise<string>} */
function hiddenQuestion(question) {
  return new Promise((resolve, reject) => {
    let value = '';
    const previousRaw = stdin.isRaw;
    emitKeypressEvents(stdin);
    stdin.setRawMode(true);
    stdin.resume();
    stdout.write(question);

    function cleanup() {
      stdin.off('keypress', onKey);
      stdin.setRawMode(previousRaw);
      stdin.pause();
      stdout.write('\n');
    }
    /** @param {string|undefined} character @param {import('node:readline').Key} key */
    function onKey(character, key) {
      if (key.ctrl && (key.name === 'c' || key.name === 'd')) {
        cleanup();
        reject(new Error('Création annulée.'));
      } else if (key.name === 'return' || key.name === 'enter') {
        cleanup();
        resolve(value);
      } else if (key.name === 'backspace') {
        if (value.length) {
          value = Array.from(value).slice(0, -1).join('');
          stdout.write('\b \b');
        }
      } else if (character && !key.ctrl && !key.meta && !character.includes('\u001b')) {
        const printable = character.replace(/[\x00-\x1f\x7f]/g, '');
        value += printable;
        stdout.write('*'.repeat(Array.from(printable).length));
      }
    }
    stdin.on('keypress', onKey);
  });
}

const args = process.argv.slice(2);
if (args.includes('--help')) {
  console.log('Usage : npm run admin:create [-- --reset]\nDéfinit le compte propriétaire dans DATA_DIR (./data par défaut).\n--reset remplace le compte existant et déconnecte toutes ses sessions.');
} else {
  try {
    if (args.some((arg) => arg !== '--reset')) throw new Error('Option inconnue. Utilisez --help.');
    if (!stdin.isTTY || !stdout.isTTY) throw new Error('Lancez cette commande dans un terminal interactif pour saisir le mot de passe de façon masquée.');
    const prompt = createPrompt({ input: stdin, output: stdout });
    const email = await prompt.question('Adresse e-mail du propriétaire : ');
    prompt.close();
    const password = await hiddenQuestion('Mot de passe (12 caractères minimum) : ');
    const confirmation = await hiddenQuestion('Confirmez le mot de passe : ');
    if (password !== confirmation) throw new Error('Les mots de passe ne correspondent pas.');
    const user = createAdmin(email, password, { reset: args.includes('--reset') });
    console.log(`Compte prêt pour ${user.email}. Connectez-vous sur /connexion.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Impossible de créer le compte.');
    process.exitCode = 1;
  }
}
