import { test } from 'node:test';
import assert from 'node:assert/strict';
import { installEnv } from './_env.mjs';

installEnv();
const { FOODS } = await import('../src/game/food-catalog.js');

test('chaque plat est complet et cohérent', () => {
  const ids = new Set();
  FOODS.forEach((food) => {
    assert.ok(food.id && !ids.has(food.id), `identifiant manquant ou en double : ${food.id}`);
    ids.add(food.id);
    assert.ok(food.file.endsWith('.glb'), `${food.id} : fichier invalide`);
    assert.ok(food.name && food.line, `${food.id} : nom ou réplique manquants`);
    assert.ok(food.height > 0.2 && food.height < 0.8, `${food.id} : hauteur irréaliste`);
    // Un plat doit nourrir : c'est sa raison d'être.
    assert.ok(food.effects.hunger >= 15, `${food.id} : ne nourrit presque pas`);
    Object.entries(food.effects).forEach(([key, value]) => {
      assert.ok(Number.isFinite(value), `${food.id} : effet ${key} non fini`);
      assert.ok(Math.abs(value) <= 40, `${food.id} : effet ${key} démesuré`);
    });
  });
  assert.ok(FOODS.length >= 5, 'trop peu de plats pour éviter la répétition');
});

test('les plats sont variés, pas sept fois le même', () => {
  const valeurs = FOODS.map((f) => f.effects.hunger);
  assert.ok(new Set(valeurs).size >= 4, 'tous les plats nourrissent pareil');
  assert.ok(FOODS.some((f) => f.effects.fun), 'aucun plat amusant');
  assert.ok(FOODS.some((f) => f.effects.hygiene < 0), 'aucun plat salissant');
  assert.ok(FOODS.some((f) => f.effects.energy > 0), 'aucun plat énergisant');
});
