const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const FFMPEG = 'C:\\Users\\mugun\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.2-full_build\\bin\\ffmpeg.exe';
const FFPROBE = 'C:\\Users\\mugun\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0.2-full_build\\bin\\ffprobe.exe';
const ASSETS_DIR = path.resolve(__dirname, '../demo_assets');

const SCENES = [
  {
    id: 'scene_01_hook',
    image: 'veo_prompt1_drone_mumbai.jpg',
    text: 'Every year across India, hundreds of harvested human organs expire in transit and are incinerated. At the same time, dying patients on state waitlists are pushed down the queue by VIP bribery and database tampering.',
    title: 'OrganProtocol — Crisis & Opportunity'
  },
  {
    id: 'scene_02_ttl',
    image: 'veo_prompt2_organ_ttl_hud.jpg',
    text: 'OrganProtocol solves this by mapping human biology directly to Arkiv\'s core breakthrough: Native Time-To-Live. When an accredited hospital harvests a donor organ, it mints an on-chain entity with an autonomous block-decay expiration: six hours for hearts, twelve for livers, thirty-six for kidneys.',
    title: 'Biological Cold-Ischemia Time as Native TTL'
  },
  {
    id: 'scene_03_radar',
    image: '01_radar_hero.png',
    text: 'Here is the live dashboard deployed on Vercel and connected to Arkiv Tiramisu testnet. On the Emergency Organ Radar, you see live organs across Delhi, Mumbai, Chennai, and Bengaluru, with live biological expiration countdowns ticking down on-chain.',
    title: 'Emergency Organ Radar & Live Countdowns'
  },
  {
    id: 'scene_04_harvest',
    image: '02_harvest_modal.png',
    text: 'When hospital nodes register a donor organ, Arkiv enforces the Cold Ischemia TTL. If an organ is not claimed in time, it naturally expires from the emergency pool, preventing retroactive timestamp forgery or black market diversion.',
    title: 'Hospital Node Verification & Organ Minting'
  },
  {
    id: 'scene_05_waitlist',
    image: '03_waitlist_tab.png',
    text: 'On the Recipient Waitlist, priority is sequenced mathematically by clinical urgency scores—such as MELD scores for liver and CPRA scores for kidney—alongside on-chain block registration height. In strict compliance with India\'s Digital Personal Data Protection Act, zero PII is stored on-chain.',
    title: 'DPDP-Compliant Recipient Priority Waitlist'
  },
  {
    id: 'scene_06_dispatch',
    image: '04_dispatch_tab.png',
    text: 'The Green Corridor Dispatch tracks inter-hospital transit and cryptographic chain of custody, ensuring rapid notification and zero administrative friction between harvest and transplantation surgical theaters.',
    title: 'Green Corridor Dispatch & Chain-of-Custody'
  },
  {
    id: 'scene_07_inspector',
    image: '05_inspector_tab.png',
    text: 'The On-Chain Inspector queries the Arkiv Tiramisu RPC directly, verifying entity keys, attribute schemas, and deterministic state transitions in real time without third-party indexers.',
    title: 'On-Chain Entity Inspector & RPC Verification'
  },
  {
    id: 'scene_08_explorer',
    image: '06_explorer_proof.png',
    text: 'On the Arkiv Tiramisu Explorer, every organ harvest and recipient registration from our verified hospital operator address is publicly verifiable. Built for the Road to Devcon 8 Mumbai, OrganProtocol delivers true Resistance to Capture under the CROPS framework. Saving organs, restoring trust, saving lives.',
    title: 'Arkiv Tiramisu Blockchain Verification'
  }
];

function generateAudio(scene) {
  const wavFile = path.join(ASSETS_DIR, `${scene.id}.wav`);
  // Use PowerShell SpeechSynthesizer with escaped quotes
  const escapedText = scene.text.replace(/'/g, "''");
  const psCmd = `Add-Type -AssemblyName System.Speech; $speak = New-Object System.Speech.Synthesis.SpeechSynthesizer; $speak.SelectVoice('Microsoft David Desktop'); $speak.Rate = 0; $speak.SetOutputToWaveFile('${wavFile.replace(/\\/g, '\\\\')}'); $speak.Speak('${escapedText}'); $speak.Dispose();`;
  
  execSync(`powershell -Command "${psCmd}"`, { stdio: 'inherit' });
  return wavFile;
}

function getAudioDuration(wavFile) {
  const out = execSync(`"${FFPROBE}" -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${wavFile}"`).toString().trim();
  return parseFloat(out);
}

function generateSceneVideo(scene, wavFile, duration) {
  const imgPath = path.join(ASSETS_DIR, scene.image);
  const outMp4 = path.join(ASSETS_DIR, `${scene.id}.mp4`);
  const totalDuration = duration + 0.8; // Add 0.8s padding for smooth pacing

  // FFmpeg command: scale image to 1920x1080, loop for audio duration + padding, encode H.264 + AAC
  const cmd = `"${FFMPEG}" -y -loop 1 -i "${imgPath}" -i "${wavFile}" -c:v libx264 -tune stillimage -c:a aac -b:a 192k -pix_fmt yuv420p -t ${totalDuration} -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2" -shortest "${outMp4}"`;
  
  execSync(cmd, { stdio: 'pipe' });
  return outMp4;
}

async function main() {
  console.log('====================================================');
  console.log('🎬 OrganProtocol — Automated Demo Video Production');
  console.log('====================================================\n');

  const segmentFiles = [];

  for (let i = 0; i < SCENES.length; i++) {
    const s = SCENES[i];
    console.log(`[${i + 1}/${SCENES.length}] Processing ${s.title}...`);
    
    // 1. Generate Voiceover
    const wav = generateAudio(s);
    const dur = getAudioDuration(wav);
    console.log(`    🎙️  Audio Duration: ${dur.toFixed(1)}s`);

    // 2. Generate Video Segment
    const mp4 = generateSceneVideo(s, wav, dur);
    console.log(`    📹  Video Segment Created: ${path.basename(mp4)}`);
    segmentFiles.push(mp4);
  }

  // 3. Concatenate all segments
  console.log('\n🎞️  Stitching all segments into final video...');
  const concatList = path.join(ASSETS_DIR, 'concat_list.txt');
  const fileContent = segmentFiles.map(f => `file '${f.replace(/\\/g, '/')}'`).join('\n');
  fs.writeFileSync(concatList, fileContent, 'utf8');

  const finalVideo = path.join(ASSETS_DIR, 'organ_protocol_demo_walkthrough.mp4');
  const concatCmd = `"${FFMPEG}" -y -f concat -safe 0 -i "${concatList}" -c copy "${finalVideo}"`;
  execSync(concatCmd, { stdio: 'inherit' });

  const totalDur = getAudioDuration(finalVideo);
  const sizeMb = (fs.statSync(finalVideo).size / (1024 * 1024)).toFixed(2);

  console.log('\n🎉 SUCCESS! Complete Demo Video Created:');
  console.log(`📁 File:     ${finalVideo}`);
  console.log(`⏱️  Duration: ${totalDur.toFixed(1)}s (${(totalDur / 60).toFixed(1)} minutes)`);
  console.log(`💾 Size:     ${sizeMb} MB`);
  console.log(`📺 Quality:  1080p Full HD, H.264 + AAC (Devfolio ready)`);
}

main().catch(console.error);
