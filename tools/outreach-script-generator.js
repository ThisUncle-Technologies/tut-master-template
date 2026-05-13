'use strict';

// Outreach Script Generator
//
// Generates personalised outreach copy for each lead based on:
//   - Website audit classification (NO_WEBSITE / BROKEN / OUTDATED / MODERN)
//   - Industry (shapes tone, specificity)
//   - Lead data (name, salesRep, social media presence)
//   - Locale (en-TZ or sw-TZ)
//
// Output per lead:
//   { classification, suggestedPitchAngle, en: { whatsappMessage, voiceNoteScript, followUpMessage }, sw: { ... }, primary }
//
// TONE RULES:
//   - Human and warm, not robotic or spammy
//   - Consultative, not pushy
//   - Short enough to read aloud (voiceNote ≈ 45–60 seconds / ~130 words)
//   - WhatsApp message ≤ 300 characters
//   - Suitable for Tanzanian business owners
//   - Never make specific claims about the demo that are not true
//   - Never pressure for an immediate purchase decision

const DEMO_BASE = 'https://demo.thisuncle.co.tz';

// ── Helper ────────────────────────────────────────────────────

function firstName(name) {
  return String(name || '').split(/\s+/)[0] || 'there';
}

function repName(lead) {
  return lead.salesRep || 'Victor';
}

// Returns a short social media note if the lead has social but no website.
function socialNote(lead) {
  var s = lead.socialMedia || {};
  if (s.facebook)  return 'active on Facebook';
  if (s.instagram) return 'active on Instagram';
  if (s.linkedin)  return 'active on LinkedIn';
  return 'active online';
}

// Swahili-native equivalent for use in SW templates.
function socialNoteSw(lead) {
  var s = lead.socialMedia || {};
  if (s.facebook)  return 'ukuaji mzuri kwenye Facebook';
  if (s.instagram) return 'ukuaji mzuri kwenye Instagram';
  if (s.linkedin)  return 'uwakilishi mzuri kwenye LinkedIn';
  return 'uwakilishi mzuri mtandaoni';
}

// ── English templates ─────────────────────────────────────────

var EN = {

  NO_WEBSITE: {
    whatsappMessage: function (lead, slug) {
      return (
        'Hi ' + firstName(lead.name) + ', I\'m ' + repName(lead) + ' from ThisUncle Technologies.\n\n' +
        'I noticed ' + lead.name + ' is ' + socialNote(lead) + ' but doesn\'t have a company website yet.\n\n' +
        'I built a free demo for you:\n' + DEMO_BASE + '/' + slug + '\n\n' +
        'No commitment — just take a look and let me know what you think.'
      );
    },
    voiceNoteScript: function (lead, slug) {
      return (
        'Hi ' + firstName(lead.name) + ', this is ' + repName(lead) + ' from ThisUncle Technologies — ' +
        'we build professional websites for Tanzanian businesses.\n\n' +
        'I was looking at ' + lead.name + ' online and noticed you don\'t have a company website yet. ' +
        'A lot of your potential clients are searching online, and without a website, you may be missing them.\n\n' +
        'So I went ahead and built a free demo version of what a website for ' + lead.name + ' could look like. ' +
        'I\'ll send you the link — it shows your services, your contact details, and a direct WhatsApp button so clients can reach you.\n\n' +
        'It\'s just a demo, no commitment. But I\'d love to hear what you think. Call or message me anytime.'
      );
    },
    followUpMessage: function (lead, slug) {
      return (
        'Hi ' + firstName(lead.name) + ', just following up on the demo website I built for ' + lead.name + ':\n' +
        DEMO_BASE + '/' + slug + '\n\n' +
        'Have you had a chance to look? Happy to walk you through it or answer any questions.'
      );
    },
  },

  BROKEN_WEBSITE: {
    whatsappMessage: function (lead, slug) {
      return (
        'Hi ' + firstName(lead.name) + ', I\'m ' + repName(lead) + ' from ThisUncle Technologies.\n\n' +
        'I tried to open ' + lead.name + '\'s website but it wasn\'t loading properly — so I built a clean working demo:\n' +
        DEMO_BASE + '/' + slug + '\n\n' +
        'Take a look when you get a chance. No obligation.'
      );
    },
    voiceNoteScript: function (lead, slug) {
      return (
        'Hi ' + firstName(lead.name) + ', this is ' + repName(lead) + ' from ThisUncle Technologies.\n\n' +
        'I came across ' + lead.name + ' online and tried to visit your website — but unfortunately it wasn\'t loading. ' +
        'It looks like there may be an issue with it.\n\n' +
        'A broken website can really hurt your business because potential clients can\'t find you or contact you online. ' +
        'So I put together a clean, working demo to show what a professional site for ' + lead.name + ' would look like.\n\n' +
        'I\'ll send you the link. It includes your services, your contact details, and a WhatsApp button for direct client enquiries. ' +
        'Let me know if you\'d like to talk further — I\'m happy to help.'
      );
    },
    followUpMessage: function (lead, slug) {
      return (
        'Hi ' + firstName(lead.name) + ', just checking in. I shared a demo I built for ' + lead.name + ' — ' +
        'your current site still seems to have loading issues.\n\n' +
        'Demo: ' + DEMO_BASE + '/' + slug + '\n\n' +
        'Happy to discuss getting this live for you. Just let me know.'
      );
    },
  },

  OUTDATED_WEBSITE: {
    whatsappMessage: function (lead, slug) {
      return (
        'Hi ' + firstName(lead.name) + ', I\'m ' + repName(lead) + ' from ThisUncle Technologies.\n\n' +
        'I came across your current website and built a modern, mobile-friendly version to show what an upgrade could look like:\n' +
        DEMO_BASE + '/' + slug + '\n\n' +
        'It\'s just a demo — have a look and let me know what you think.'
      );
    },
    voiceNoteScript: function (lead, slug) {
      return (
        'Hi ' + firstName(lead.name) + ', this is ' + repName(lead) + ' from ThisUncle Technologies.\n\n' +
        'I came across ' + lead.name + '\'s website recently. It\'s there and it works — which is good. ' +
        'But honestly, it looks quite dated compared to what clients expect today. ' +
        'Most people are on their phones, and older websites don\'t show well on mobile.\n\n' +
        'So I built a free demo of what a modern version could look like — clean, fast, mobile-friendly, ' +
        'with a direct WhatsApp button so clients can reach you immediately.\n\n' +
        'I\'ve sent you the link. Take a look when you get a chance. ' +
        'If you like it, we can talk about what it would take to make it live. No pressure.'
      );
    },
    followUpMessage: function (lead, slug) {
      return (
        'Hi ' + firstName(lead.name) + ', following up on the modern website demo I built for ' + lead.name + ':\n' +
        DEMO_BASE + '/' + slug + '\n\n' +
        'Would love your feedback. If you want any changes to the demo before deciding, I\'m happy to adjust it.'
      );
    },
  },

  MODERN_WEBSITE: {
    whatsappMessage: function (lead, slug) {
      return (
        'Hi ' + firstName(lead.name) + ', I\'m ' + repName(lead) + ' from ThisUncle Technologies.\n\n' +
        'Your current website is solid — I put together a premium demo showing what a conversion-focused upgrade could look like:\n' +
        DEMO_BASE + '/' + slug + '\n\n' +
        'Stronger CTAs, WhatsApp integration, faster load. Take a look when you get a moment.'
      );
    },
    voiceNoteScript: function (lead, slug) {
      return (
        'Hi ' + firstName(lead.name) + ', this is ' + repName(lead) + ' from ThisUncle Technologies.\n\n' +
        'I visited ' + lead.name + '\'s website — and to be honest, it\'s better than most. You\'re already ahead online.\n\n' +
        'But I noticed a few things that could help turn more visitors into actual enquiries — ' +
        'like clearer calls-to-action, a direct WhatsApp button, and a tighter mobile experience.\n\n' +
        'I\'ve built a demo focused on those improvements. I\'ll send you the link. ' +
        'If you\'d like to explore what an upgrade would cost, I\'m happy to have that conversation. No hard sell.'
      );
    },
    followUpMessage: function (lead, slug) {
      return (
        'Hi ' + firstName(lead.name) + ', following up on the premium demo I sent for ' + lead.name + ':\n' +
        DEMO_BASE + '/' + slug + '\n\n' +
        'If you\'ve had a look, I\'d love your thoughts. Even if you\'re happy with what you have, ' +
        'I\'m happy to give free feedback on your current site. Just say the word.'
      );
    },
  },
};

// ── Swahili templates ─────────────────────────────────────────

var SW = {

  NO_WEBSITE: {
    whatsappMessage: function (lead, slug) {
      return (
        'Habari ' + firstName(lead.name) + ', mimi ni ' + repName(lead) + ' kutoka ThisUncle Technologies.\n\n' +
        'Nimeona ' + lead.name + ' ina ' + socialNoteSw(lead) + ' lakini bado haina tovuti rasmi.\n\n' +
        'Nimetengeneza demo ya bure:\n' + DEMO_BASE + '/' + slug + '\n\n' +
        'Angalia na unijulishe mawazo yako. Hakuna wajibu wowote.'
      );
    },
    voiceNoteScript: function (lead, slug) {
      return (
        'Habari ' + firstName(lead.name) + ', mimi ni ' + repName(lead) + ' kutoka ThisUncle Technologies — ' +
        'tunajenga tovuti za kitaalamu kwa biashara za Tanzania.\n\n' +
        'Nilitazama ' + lead.name + ' mtandaoni na nikagundua hamna tovuti ya kampuni. ' +
        'Wateja wengi wanakutafuta mtandaoni, na bila tovuti unaweza kukosa fursa nyingi.\n\n' +
        'Kwa hiyo nilitengeneza demo ya bure ya jinsi tovuti ya ' + lead.name + ' ingeonekana. ' +
        'Natatuma link — inaonyesha huduma zako, mawasiliano yako, na kitufe cha WhatsApp ili wateja wakuwasiliane nawe moja kwa moja.\n\n' +
        'Ni demo tu, bila wajibu. Ningependa kusikia mawazo yako.'
      );
    },
    followUpMessage: function (lead, slug) {
      return (
        'Habari ' + firstName(lead.name) + ', ninafuatilia kuhusu demo ya tovuti niliyojenga kwa ' + lead.name + ':\n' +
        DEMO_BASE + '/' + slug + '\n\n' +
        'Umeweza kuangalia? Niko tayari kukueleza au kujibu maswali yoyote.'
      );
    },
  },

  BROKEN_WEBSITE: {
    whatsappMessage: function (lead, slug) {
      return (
        'Habari ' + firstName(lead.name) + ', mimi ni ' + repName(lead) + ' kutoka ThisUncle Technologies.\n\n' +
        'Nilijaribu kufungua tovuti ya ' + lead.name + ' lakini haikufunguka — kwa hiyo nilitengeneza demo inayofanya kazi:\n' +
        DEMO_BASE + '/' + slug + '\n\n' +
        'Angalia ukipata muda. Hakuna wajibu.'
      );
    },
    voiceNoteScript: function (lead, slug) {
      return (
        'Habari ' + firstName(lead.name) + ', mimi ni ' + repName(lead) + ' kutoka ThisUncle Technologies.\n\n' +
        'Nilikutana na ' + lead.name + ' mtandaoni na nilijaribu kutembelea tovuti yenu — lakini haikufunguka. ' +
        'Inaonekana kuna tatizo nayo.\n\n' +
        'Tovuti isiyofunguka inaweza kudhuru biashara yako kwa sababu wateja hawawezi kukupata. ' +
        'Kwa hiyo nilitengeneza demo ya tovuti safi na inayofanya kazi kwa ' + lead.name + '.\n\n' +
        'Natatuma link. Ina huduma zako, mawasiliano, na kitufe cha WhatsApp. Niambie kama ungependa kuzungumza zaidi.'
      );
    },
    followUpMessage: function (lead, slug) {
      return (
        'Habari ' + firstName(lead.name) + ', ninafuatilia. Nilituma demo kwa ' + lead.name + ' — ' +
        'tovuti yako ya sasa bado inaonekana ina matatizo.\n\n' +
        'Demo: ' + DEMO_BASE + '/' + slug + '\n\n' +
        'Niko tayari kuzungumza kuhusu kuifanya iwe hai.'
      );
    },
  },

  OUTDATED_WEBSITE: {
    whatsappMessage: function (lead, slug) {
      return (
        'Habari ' + firstName(lead.name) + ', mimi ni ' + repName(lead) + ' kutoka ThisUncle Technologies.\n\n' +
        'Niliona tovuti yako ya sasa na nilitengeneza toleo jipya, la kisasa, linaloenda vizuri kwa simu:\n' +
        DEMO_BASE + '/' + slug + '\n\n' +
        'Ni demo tu — angalia na unijulishe mawazo yako.'
      );
    },
    voiceNoteScript: function (lead, slug) {
      return (
        'Habari ' + firstName(lead.name) + ', mimi ni ' + repName(lead) + ' kutoka ThisUncle Technologies.\n\n' +
        'Niliangalia tovuti ya ' + lead.name + ' hivi karibuni. Ipo na inafanya kazi — jambo zuri. ' +
        'Lakini kimuonekano ni ya zamani kidogo. Watu wengi wanatumia simu zao, na tovuti za zamani hazionekani vizuri.\n\n' +
        'Kwa hiyo nilitengeneza demo ya bure ya jinsi tovuti ya kisasa ingeonekana — safi, haraka, na na kitufe cha WhatsApp.\n\n' +
        'Natatuma link. Ione ukipata muda. Kama utapenda, tunaweza kuzungumza bei. Hakuna shinikizo.'
      );
    },
    followUpMessage: function (lead, slug) {
      return (
        'Habari ' + firstName(lead.name) + ', ninafuatilia kuhusu demo ya kisasa niliyotengeneza:\n' +
        DEMO_BASE + '/' + slug + '\n\n' +
        'Ningependa kusikia mawazo yako. Kama unataka mabadiliko yoyote, niko tayari.'
      );
    },
  },

  MODERN_WEBSITE: {
    whatsappMessage: function (lead, slug) {
      return (
        'Habari ' + firstName(lead.name) + ', mimi ni ' + repName(lead) + ' kutoka ThisUncle Technologies.\n\n' +
        'Tovuti yako iko vizuri — nilitengeneza demo ya kiwango cha juu kuonyesha jinsi upgrade ingeonekana:\n' +
        DEMO_BASE + '/' + slug + '\n\n' +
        'Ina CTAs bora zaidi na imeboreshwa kwa wateja. Angalia ukipata muda.'
      );
    },
    voiceNoteScript: function (lead, slug) {
      return (
        'Habari ' + firstName(lead.name) + ', mimi ni ' + repName(lead) + ' kutoka ThisUncle Technologies.\n\n' +
        'Nilitembelea tovuti ya ' + lead.name + ' — na nikuambie ukweli, ni bora kuliko nyingi. Uko mbele mtandaoni.\n\n' +
        'Lakini kuna mambo machache ambayo yangeweza kuboresha jinsi wateja wanavyowasiliana nawe — ' +
        'wito wa hatua bora, muunganiko wa WhatsApp, na uzoefu wa simu ulioimarishwa.\n\n' +
        'Nilitengeneza demo inayozingatia hilo. Natatuma link. Ni demo tu — angalia, na kama ungependa kujua zaidi, niko tayari kuzungumza.'
      );
    },
    followUpMessage: function (lead, slug) {
      return (
        'Habari ' + firstName(lead.name) + ', ninafuatilia kuhusu demo ya premium:\n' +
        DEMO_BASE + '/' + slug + '\n\n' +
        'Kama umekwisha kuangalia, ningependa kusikia maoni yako.'
      );
    },
  },
};

// ── Public API ────────────────────────────────────────────────

function generateOutreachScript(lead, audit, slug) {
  var classification = audit.classification || 'NO_WEBSITE';
  var locale         = lead.locale === 'sw-TZ' ? 'sw-TZ' : 'en-TZ';

  var enTpl = EN[classification] || EN.NO_WEBSITE;
  var swTpl = SW[classification] || SW.NO_WEBSITE;

  return {
    classification:      classification,
    suggestedPitchAngle: audit.suggestedPitchAngle || 'no-website',
    en: {
      whatsappMessage: enTpl.whatsappMessage(lead, slug),
      voiceNoteScript: enTpl.voiceNoteScript(lead, slug),
      followUpMessage: enTpl.followUpMessage(lead, slug),
    },
    sw: {
      whatsappMessage: swTpl.whatsappMessage(lead, slug),
      voiceNoteScript: swTpl.voiceNoteScript(lead, slug),
      followUpMessage: swTpl.followUpMessage(lead, slug),
    },
    // primary tells the dashboard which language to show first
    primary: locale === 'sw-TZ' ? 'sw' : 'en',
  };
}

// ── CLI entry point ───────────────────────────────────────────

if (require.main === module) {
  var fs   = require('fs');
  var path = require('path');
  var args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: node tools/outreach-script-generator.js <lead.json> <audit.json> [slug]');
    process.exit(1);
  }

  var lead  = JSON.parse(fs.readFileSync(args[0], 'utf8'));
  var audit = JSON.parse(fs.readFileSync(args[1], 'utf8'));
  var slug  = args[2] || require('./utils/slug').slugify(lead.name);

  var result = generateOutreachScript(lead, audit, slug);
  console.log(JSON.stringify(result, null, 2));
}

module.exports = { generateOutreachScript };
