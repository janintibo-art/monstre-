import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installEnv } from './_env.mjs';

installEnv();
const { extractFacts } = await import('../src/ai/facts.js');
const { createMemory, learnFrom, learn, consolidate, knownFacts, playerName, factStrength, ensureMemory } =
  await import('../src/ai/memory.js');

test('extraction : prenom, ville, gouts, proches', () => {
  const texts = {
    "Salut, je m'appelle Thibault": 'name',
    "j'habite à Lyon": 'home',
    "j'adore la musique": 'like',
    'je déteste les lundis': 'dislike',
    "mon chat s'appelle Nougat": 'relation',
    'je travaille dans la radio': 'work'
  };
  Object.entries(texts).forEach(([text, kind]) => {
    const found = extractFacts(text);
    assert.equal(found[0] && found[0].kind, kind, text);
  });
});

test('extraction : faux positifs ecartes', () => {
  assert.equal(extractFacts('je suis pas content').length, 0);
  assert.equal(extractFacts("j'aime bien quand tu danses").length, 0);
  assert.equal(extractFacts('je ne sais pas').length, 0);
});

test('un fait repete se renforce au lieu de se dupliquer', () => {
  const memory = createMemory();
  learnFrom(memory, "j'adore le chocolat");
  learnFrom(memory, "j'adore le chocolat");
  const facts = knownFacts(memory);
  assert.equal(facts.length, 1);
  assert.equal(facts[0].count, 2);
  assert.ok(facts[0].strength > 1);
});

test('un demenagement ecrase l ancienne adresse', () => {
  const memory = createMemory();
  learnFrom(memory, "j'habite à Lyon");
  learnFrom(memory, "j'habite à Nantes");
  const homes = knownFacts(memory).filter((f) => f.kind === 'home');
  assert.equal(homes.length, 1);
  assert.equal(homes[0].value, 'Nantes');
});

test("l'oubli efface les intentions datees avant les gouts", () => {
  const memory = createMemory();
  learnFrom(memory, 'demain je pars en vacances');
  learnFrom(memory, "j'adore le chocolat");
  const inThreeDays = Date.now() + 3 * 86400000;
  const plan = memory.facts.find((f) => f.kind === 'plan');
  const like = memory.facts.find((f) => f.kind === 'like');
  assert.ok(factStrength(plan, inThreeDays) < 0.18, 'le projet est oublie');
  assert.ok(factStrength(like, inThreeDays) > 0.18, 'le gout est encore la');
  const removed = consolidate(memory, inThreeDays);
  assert.equal(removed, 1);
});

test('le prenom resiste tres longtemps', () => {
  const memory = createMemory();
  learnFrom(memory, "je m'appelle Marie");
  const inTwoWeeks = Date.now() + 14 * 86400000;
  consolidate(memory, inTwoWeeks);
  assert.equal(playerName(memory), 'Marie');
});

test('une memoire ancienne est completee sans perte', () => {
  const old = { events: [{ t: 1, type: 'feed' }], stats: { feed: 1 } };
  const memory = ensureMemory(old);
  assert.equal(memory.events.length, 1);
  assert.ok(Array.isArray(memory.facts));
  assert.ok(Array.isArray(memory.dialogue));
});

test('la memoire deborde par le souvenir le plus faible', () => {
  const memory = createMemory();
  for (let i = 0; i < 45; i += 1) learn(memory, { kind: 'like', key: `like:${i}`, value: `${i}`, text: `Tu aimes ${i}.` });
  assert.ok(memory.facts.length <= 40);
});
