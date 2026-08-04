'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { pool } = require('../config/db');

async function cleanDb() {
  console.log('🧹 Début du nettoyage de la base de données...');
  try {
    await pool.execute('SET FOREIGN_KEY_CHECKS = 0');

    const tables = [
      'project_members',
      'task_comments',
      'tasks',
      'projects',
    ];

    // Tables optionnelles (peuvent ne pas exister)
    const optionalTables = [
      'team_members',
      'teams',
      'planning_events',
      'documents',
      'direct_messages',
      'user_notifications',
      'notifications',
    ];

    for (const table of tables) {
      await pool.execute(`DELETE FROM ${table}`);
      console.log(`  ✅ Table '${table}' vidée.`);
    }

    for (const table of optionalTables) {
      try {
        await pool.execute(`DELETE FROM ${table}`);
        console.log(`  ✅ Table '${table}' vidée.`);
      } catch (err) {
        console.log(`  ⚠️  Table '${table}' ignorée (${err.message}).`);
      }
    }

    // Afficher les admins conservés
    const [admins] = await pool.execute("SELECT id, nom_prenom, email FROM users WHERE role = 'admin'");
    console.log('\n👑 Admins conservés :');
    admins.forEach(a => console.log(`   - [${a.id}] ${a.nom_prenom} (${a.email})`));

    // Supprimer tous les non-admins
    const [delResult] = await pool.execute("DELETE FROM users WHERE role != 'admin'");
    console.log(`\n  🗑️  ${delResult.affectedRows} utilisateur(s) non-admin supprimé(s).`);

    await pool.execute('SET FOREIGN_KEY_CHECKS = 1');

    const [remaining] = await pool.execute('SELECT id, nom_prenom, email, role FROM users');
    console.log('\n📋 Utilisateurs restants :');
    remaining.forEach(u => console.log(`   - [${u.id}] ${u.nom_prenom} — ${u.role}`));

    console.log('\n🎉 Nettoyage terminé avec succès.');
  } catch (err) {
    console.error('❌ Erreur:', err.message);
    await pool.execute('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});
  } finally {
    process.exit(0);
  }
}

cleanDb();
