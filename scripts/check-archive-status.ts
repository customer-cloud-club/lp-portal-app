#!/usr/bin/env ts-node
/**
 * アーカイブ状況確認スクリプト
 */

import { getAllEvents } from '../lib/larkbase-client.js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function main() {
  const events = await getAllEvents();

  console.log('=== イベント一覧（YouTube URLあり、アーカイブなし）===\n');

  const needsArchive: Array<{id: string; title: string; date: string; youtube: string}> = [];

  events.forEach((e, i) => {
    const hasYoutube = !!e.youtube_url;
    const hasArchive = !!(e.archive_file_token || e.archive_url);
    if (hasYoutube && !hasArchive) {
      const date = new Date(e.scheduled_at);
      const dateStr = date.toISOString().slice(0,10).replace(/-/g,'');
      needsArchive.push({
        id: e.id,
        title: e.title,
        date: dateStr,
        youtube: e.youtube_url!
      });
      console.log(`${needsArchive.length}. [${e.id}] ${dateStr}_${e.title.slice(0,40)}`);
      console.log(`   YouTube: ${e.youtube_url}`);
      console.log('');
    }
  });

  console.log('\n=== 全イベント統計 ===');
  console.log(`合計: ${events.length}件`);
  console.log(`YouTube URLあり: ${events.filter(e => e.youtube_url).length}件`);
  console.log(`アーカイブあり: ${events.filter(e => e.archive_file_token || e.archive_url).length}件`);
  console.log(`アーカイブ未処理: ${needsArchive.length}件`);
}

main().catch(console.error);
