
'use strict';

// Import required modules
const baileys = require('@whiskeysockets/baileys');
const logger = require('pino');
const boom = require('@hapi/boom');
const conf = require('./config');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');
const FileType = require('file-type');
const { Sticker, createSticker, StickerTypes } = require('wa-sticker-formatter');
const { verifierEtatJid, recupererActionJid } = require('./lib/antilien');
const { atbverifierEtatJid, atbrecupererActionJid } = require('./lib/antibot');

// Initialize logger
const log = logger({ level: 'silent' });

// Load event handlers
let evt = require(__dirname + '/Ibrahim/app');

// Import ban and admin management functions
const { isUserBanned, addUserToBanList, removeUserFromBanList } = require('./lib/banUser');
const { addGroupToBanList, isGroupBanned, removeGroupFromBanList } = require('./lib/banGroup');
const { isGroupOnlyAdmin, addGroupToOnlyAdminList, removeGroupFromOnlyAdminList } = require('./lib/onlyAdmin');

// Import reaction handler
let { reagir } = require(__dirname + '/Ibrahim/adams');

// Configuration
var session = conf.SESSION_ID.replace(/CASPER-TECH~, '');
const prefixe = conf.PREFIXE;
const more = String.fromCharCode(8206);
const readmore = more.repeat(4001);

// Authentication function
async function authentification() {
    try {
        if (!fs.existsSync(__dirname + '/Session/creds.json')) {
            console.log('Session Invalid, rescan again...');
            await fs.writeFileSync(__dirname + '/Session/creds.json', atob(session), 'utf8');
        } else if (fs.existsSync(__dirname + '/Session/creds.json') && session != "zokk") {
            await fs.writeFileSync(__dirname + '/Session/creds.json', atob(session), 'utf8');
        }
    } catch (error) {
        console.log('redemarrage sur le coup de l\'erreur ' + error);
        return;
    }
}

authentification();

// Create in-memory store
const store = baileys.makeInMemoryStore({
    logger: log.child({ level: 'silent', stream: 'store.json' })
});

setTimeout(() => {
    async function startBot() {
        // Get latest Baileys version
        const { version, isLatest } = await baileys.fetchLatestBaileysVersion();
        
        // Load authentication state
        const { state, saveCreds } = await baileys.useMultiFileAuthState(__dirname + '/Session');
        
        // Bot configuration
        const botConfig = {
            version: version,
            logger: log({ level: 'silent' }),
            browser: ['CASPER', 'safari', '1.0.0'],
            printQRInTerminal: true,
            fireInitQueries: false,
            shouldSyncHistoryMessage: true,
            downloadHistory: false,
            syncFullHistory: false,
            generateHighQualityLinkPreview: true,
            markOnlineOnConnect: false,
            keepAliveIntervalMs: 30000,
            auth: {
                creds: state.creds,
                keys: baileys.makeCacheableSignalKeyStore(state.keys, log)
            },
            getMessage: async (key) => {
                if (store) {
                    const msg = await store.loadMessage(key.remoteJid, key.id, undefined);
                    return msg.message || undefined;
                }
                return { conversation: 'An Error Occurred, Repeat Command!' };
            }
        };

        // Create bot instance
        const bot = baileys.default(botConfig);
        
        // Bind store to bot events
        store.bind(bot.ev);
        
        // Save store periodically
        setInterval(() => {
            store.writeToFile('./store.json');
        }, 3000);

        // Handle incoming messages
        bot.ev.on('messages.upsert', async (m) => {
            const { messages } = m;
            const ms = messages[0];
            if (!ms.message) return;

            // Helper functions
            const decodeJid = (jid) => {
                if (!jid) return jid;
                if (/:\d+@/gi.test(jid)) {
                    let decode = baileys.jidDecode(jid) || {};
                    return decode.user && decode.server && decode.user + '@' + decode.server || jid;
                } else return jid;
            };

            // Extract message content
            var mtype = baileys.getContentType(ms.message);
            var texte = mtype == "conversation" ? ms.message.conversation :
                       mtype == "imageMessage" ? ms.message.imageMessage?.caption :
                       mtype == "videoMessage" ? ms.message.videoMessage?.caption :
                       mtype == "extendedTextMessage" ? ms.message?.extendedTextMessage?.text :
                       mtype == "buttonsResponseMessage" ? ms.message?.buttonsResponseMessage?.selectedButtonId :
                       mtype == "listResponseMessage" ? ms.message?.listResponseMessage?.singleSelectReply?.selectedRowId :
                       mtype == "messageContextInfo" ? ms.message?.listResponseMessage?.singleSelectReply?.selectedRowId || ms.message?.buttonsResponseMessage?.selectedButtonId || ms.text : "";

            var origineMessage = ms.key.remoteJid;
            var idBot = decodeJid(bot.user.id);
            var servBot = idBot.split('@')[0];
            const verifGroupe = origineMessage?.endsWith("@g.us");
            
            var infosGroupe = verifGroupe ? await bot.groupMetadata(origineMessage) : "";
            var nomGroupe = verifGroupe ? infosGroupe.subject : "";
            var msgRepondu = ms.message.extendedTextMessage?.contextInfo?.quotedMessage;
            var auteurMsgRepondu = decodeJid(ms.message?.extendedTextMessage?.contextInfo?.participant);
            var mr = ms.message?.extendedTextMessage?.contextInfo?.mentionedJid;
            var auteurMessage = verifGroupe ? (ms.key.participant ? ms.key.participant : ms.participant) : origineMessage;
            
            if (ms.key.fromMe) {
                auteurMessage = idBot;
            }

            var membreGroupe = verifGroupe ? ms.key.participant : '';
            const { getAllSudoNumbers } = require('./lib/sudo');
            var nomAuteurMessage = ms.pushName;
            var numeroOwner = '254732982940';
            const ownerNumber = '254732982940';
            const devNumber = '254732982940';
            const devNumber2 = '254732982940';
            
            const sudoNumbers = await getAllSudoNumbers();
            const ownerNumbers = [servBot, numeroOwner, ownerNumber, devNumber, devNumber2, conf.NUMERO_OWNER]
                .map(s => s.replace(/[^0-9]/g) + "@s.whatsapp.net");
            const allOwners = ownerNumbers.concat(sudoNumbers);
            const superUser = allOwners.includes(auteurMessage);
            
            var dev = [numeroOwner, ownerNumber, devNumber, devNumber2]
                .map(t => t.replace(/[^0-9]/g) + "@s.whatsapp.net")
                .includes(auteurMessage);

            // Reply function
            function repondre(teks) {
                bot.sendMessage(origineMessage, { text: teks }, { quoted: ms });
            }

            console.log("\t🌍 CASPER-MD ONLINE🌍");
            console.log("===========written message===========");
            
            if (verifGroupe) {
                console.log("message from group : " + nomGroupe);
            }
            
            console.log("message from : [" + nomAuteurMessage + " : " + auteurMessage.split("@s.whatsapp.net")[0] + " ]");
            console.log("message type : " + mtype);
            console.log("------ message ------");
            console.log(texte);

            // Helper function to get group participants
            function groupeAdmin(participants) {
                let admins = [];
                for (m of participants) {
                    if (m.admin == null) continue;
                    admins.push(m.id);
                }
                return admins;
            }

            // Set presence
            var etat = conf.ETAT;
            if (etat == 1) {
                await bot.sendPresenceUpdate('available', origineMessage);
            } else if (etat == 2) {
                await bot.sendPresenceUpdate('composing', origineMessage);
            } else if (etat == 3) {
                await bot.sendPresenceUpdate('recording', origineMessage);
            } else {
                await bot.sendPresenceUpdate('unavailable', origineMessage);
            }

            // Group admin checks
            const mbre = verifGroupe ? await infosGroupe.participants : '';
            let admins = verifGroupe ? groupeAdmin(mbre) : '';
            const verifAdmin = verifGroupe ? admins.includes(auteurMessage) : false;
            var verifBotAdmin = verifGroupe ? admins.includes(idBot) : false;

            // Command processing
            const arg = texte ? texte.trim().split(/ +/).slice(1) : null;
            const verifCom = texte ? texte.startsWith(prefixe) : false;
            const commande = verifCom ? texte.slice(1).trim().split(/ +/).shift().toLowerCase() : false;
            
            const bais = conf.NOM_OWNER.split(',');
            
            function mybotpic() {
                const p = Math.floor(Math.random() * bais.length);
                const i = bais[p];
                return i;
            }

            // Create zokou object with all necessary data
            var zokou = {
                'superUser': superUser,
                'dev': dev,
                'verifGroupe': verifGroupe,
                'mbre': mbre,
                'membreGroupe': membreGroupe,
                'verifAdmin': verifAdmin,
                'infosGroupe': infosGroupe,
                'nomGroupe': nomGroupe,
                'auteurMessage': auteurMessage,
                'nomAuteurMessage': nomAuteurMessage,
                'idBot': idBot,
                'verifBotAdmin': verifBotAdmin,
                'prefixe': prefixe,
                'arg': arg,
                'repondre': repondre,
                'mtype': mtype,
                'groupeAdmin': groupeAdmin,
                'msgRepondu': msgRepondu,
                'auteurMsgRepondu': auteurMsgRepondu,
                'ms': ms,
                'mybotpic': mybotpic
            };

            // Handle deleted messages
            if (ms.message.protocolMessage && ms.message.protocolMessage.type === 0 && conf.ADM.toLowerCase() === "yes") {
                if (ms.key.fromMe || ms.message.protocolMessage.key.fromMe) {
                    console.log("Message deleted concerning me");
                    return;
                }
                
                console.log("Message deleted");
                let key = ms.message.protocolMessage.key;
                
                try {
                    let st = "./store.json";
                    const data = fs.readFileSync(st, 'utf8');
                    const jsonData = JSON.parse(data);
                    let messages = jsonData.messages[key.remoteJid];
                    let message;
                    
                    for (let i = 0; i < messages.length; i++) {
                        if (messages[i].key.id === key.id) {
                            message = messages[i];
                            break;
                        }
                    }
                    
                    if (message === null || !message || message === "Message not found") {
                        console.log("Message not found");
                        return;
                    }
                    
                    await bot.sendMessage(idBot, {
                        image: { url: "./files/deleted-message.jpg" },
                        caption: "        *Deleted message detected*\n\n 🚮 Deleted by @" + message.key.participant.split('@')[0] + "​",
                        mentions: [message.key.participant]
                    }).then(() => {
                        bot.sendMessage(idBot, { forward: message }, { quoted: message });
                    });
                } catch (e) {
                    console.log(e);
                }
            }

            // Auto-read status
            if (ms.key && ms.key.remoteJid === "status@broadcast" && conf.AUTO_READ_STATUS === "yes") {
                await bot.readMessages([ms.key]);
            }

            // Auto-download status
            if (ms.key && ms.key.remoteJid === "status@broadcast" && conf.AUTO_DOWNLOAD_STATUS === 'yes') {
                if (ms.message.extendedTextMessage) {
                    var stTxt = ms.message.extendedTextMessage.text;
                    await bot.sendMessage(idBot, { text: stTxt }, { quoted: ms });
                } else if (ms.message.imageMessage) {
                    var stMsg = ms.message.imageMessage.caption;
                    var stImg = await bot.downloadAndSaveMediaMessage(ms.message.imageMessage);
                    await bot.sendMessage(idBot, { image: { url: stImg }, caption: stMsg }, { quoted: ms });
                } else if (ms.message.videoMessage) {
                    var stMsg = ms.message.videoMessage.caption;
                    var stVideo = await bot.downloadAndSaveMediaMessage(ms.message.videoMessage);
                    await bot.sendMessage(idBot, { video: { url: stVideo }, caption: stMsg }, { quoted: ms });
                }
            }

            // Skip processing for specific group
            if (!dev && origineMessage == "120363158701337904@g.us") return;

            // Level system
            if (texte && auteurMessage.endsWith("s.whatsapp.net")) {
                const { ajouterOuMettreAJourUserData } = require('./lib/level');
                try {
                    await ajouterOuMettreAJourUserData(auteurMessage);
                } catch (e) {
                    console.error(e);
                }
            }

            // Mention response
            try {
                if (ms.message[mtype].contextInfo.mentionedJid && (ms.message[mtype].contextInfo.mentionedJid.includes(idBot) || ms.message[mtype].contextInfo.mentionedJid.includes(conf.NUMERO_OWNER + '@s.whatsapp.net'))) {
                    if (origineMessage == "120363158701337904@g.us") return;
                    
                    if (superUser) {
                        console.log("SuperUser case, doing nothing");
                        return;
                    }
                    
                    let mention = require('./lib/mention');
                    let reponseMention = await mention.recupererToutesLesValeurs();
                    let allVal = reponseMention[0];
                    
                    if (allVal.status === 'non') {
                        console.log("Mentions not active");
                        return;
                    }
                    
                    let reponse;
                    if (allVal.type.toLocaleLowerCase() === 'image') {
                        reponse = { image: { url: allVal.url }, caption: allVal.message };
                    } else if (allVal.type.toLocaleLowerCase() === 'video') {
                        reponse = { video: { url: allVal.url }, caption: allVal.message };
                    } else if (allVal.type.toLocaleLowerCase() === 'sticker') {
                        let stickerMess = new Sticker(allVal.url, {
                            pack: conf.NOM_OWNER,
                            type: StickerTypes.FULL,
                            categories: ['🤩', '🎉'],
                            id: '12345',
                            quality: 70,
                            background: 'transparent'
                        });
                        const stickerBuffer = await stickerMess.toBuffer();
                        reponse = { sticker: stickerBuffer };
                    } else if (allVal.type.toLocaleLowerCase() === 'audio') {
                        reponse = { audio: { url: allVal.url }, mimetype: 'audio/mp4' };
                    }
                    
                    bot.sendMessage(origineMessage, reponse, { quoted: ms });
                }
            } catch (e) {}

            // Anti-link functionality
            try {
                const etatAntiLien = await verifierEtatJid(origineMessage);
                if (texte.includes('https://') && verifGroupe && etatAntiLien) {
                    console.log("Link detected");
                    var verifBotAdmin = verifGroupe ? admins.includes(idBot) : false;
                    
                    if (superUser || verifAdmin || !verifBotAdmin) {
                        console.log("Superuser case, doing nothing");
                        return;
                    }
                    
                    const key = { remoteJid: origineMessage, fromMe: false, id: ms.key.id, participant: auteurMessage };
                    var txt = "link detected, \n";
                    const gifLink = "https://raw.githubusercontent.com/djalega8000/Zokou-MD/main/media/remover.gif";
                    
                    var sticker = new Sticker(gifLink, {
                        pack: 'CASPER-MD',
                        author: conf.OWNER_NAME,
                        type: StickerTypes.FULL,
                        categories: ['🤩', '🎉'],
                        id: '12345',
                        quality: 50,
                        background: '#000000'
                    });
                    
                    await sticker.toFile('./files/chrono.webp');
                    
                    var action = await recupererActionJid(origineMessage);
                    
                    if (action === 'remove') {
                        txt += " @" + auteurMessage.split('@')[0] + " removed from group.";
                        await bot.sendMessage(origineMessage, { sticker: fs.readFileSync('st1.webp') });
                        baileys.delay(800);
                        await bot.sendMessage(origineMessage, { text: txt, mentions: [auteurMessage] }, { quoted: ms });
                        
                        try {
                            await bot.groupParticipantsUpdate(origineMessage, [auteurMessage], 'remove');
                        } catch (e) {
                            console.log("Could not remove user: " + e);
                        }
                        
                        await bot.sendMessage(origineMessage, { delete: key });
                        await fs.unlink("st1.webp");
                    } else if (action === 'delete') {
                        txt += "message deleted \n @" + auteurMessage.split('@')[0] + " avoid sending link.";
                        await bot.sendMessage(origineMessage, { text: txt, mentions: [auteurMessage] }, { quoted: ms });
                        await bot.sendMessage(origineMessage, { delete: key });
                        await fs.unlink("st1.webp");
                    } else if (action === 'warn') {
                        const { getWarnCountByJID, ajouterUtilisateurAvecWarnCount } = require('./lib/warn');
                        let warn_count = await getWarnCountByJID(auteurMessage);
                        let max_warn = conf.WARN_COUNT;
                        
                        if (warn_count >= max_warn) {
                            var txt = "link detected, you will be removed because of reaching warn-limit";
                            await bot.sendMessage(origineMessage, { text: txt, mentions: [auteurMessage] }, { quoted: ms });
                            await bot.groupParticipantsUpdate(origineMessage, [auteurMessage], 'remove');
                            await bot.sendMessage(origineMessage, { delete: key });
                        } else {
                            var rest = max_warn - warn_count;
                            var txt = "Link detected, your warn_count was upgraded ;\n rest : " + rest + " ";
                            await ajouterUtilisateurAvecWarnCount(auteurMessage);
                            await bot.sendMessage(origineMessage, { text: txt, mentions: [auteurMessage] }, { quoted: ms });
                            await bot.sendMessage(origineMessage, { delete: key });
                        }
                    }
                }
            } catch (e) {
                console.log('lib err ' + e);
            }

            // Anti-bot functionality
            try {
                const botPrefixes = ms.key?.id?.startsWith('BAES') && ms.key?.id?.length === 16;
                const botPrefixes2 = ms.key?.id?.startsWith('BAE5') && ms.key?.id?.length === 16;
                
                if (botPrefixes || botPrefixes2) {
                    if (mtype === 'reactionMessage') {
                        console.log("I don't react to reactions");
                        return;
                    }
                    
                    const etatAntiBot = await atbverifierEtatJid(origineMessage);
                    if (!etatAntiBot) return;
                    
                    if (verifAdmin || auteurMessage === idBot) {
                        console.log("Superuser case, doing nothing");
                        return;
                    }
                    
                    const key = { remoteJid: origineMessage, fromMe: false, id: ms.key.id, participant: auteurMessage };
                    var txt = "bot detected, \n";
                    const gifLink = 'https://raw.githubusercontent.com/djalega8000/Zokou-MD/main/media/remover.gif';
                    
                    var sticker = new Sticker(gifLink, {
                        pack: 'CASPER',
                        author: conf.OWNER_NAME,
                        type: StickerTypes.FULL,  
                        categories: ['🤩', '🎉'],
                        id: '12345',
                        quality: 50,
                        background: '#000000'
                    });
                    
                    await sticker.toFile("st1.webp");
                    
                    var action = await atbrecupererActionJid(origineMessage);
                    
                    if (action === 'remove') {
                        txt += " @" + auteurMessage.split('@')[0] + " removed from group.";
                        await bot.sendMessage(origineMessage, { sticker: fs.readFileSync("st1.webp") });
                        baileys.delay(800);
                        await bot.sendMessage(origineMessage, { text: txt, mentions: [auteurMessage] }, { quoted: ms });
                        
                        try {
                            await bot.groupParticipantsUpdate(origineMessage, [auteurMessage], 'remove');
                        } catch (e) {
                            console.log("bot detected; could not remove: " + e);
                        }
                        
                        await bot.sendMessage(origineMessage, { delete: key });
                        await fs.unlink("st1.webp");
                    } else if (action === 'delete') {
                        txt += "message deleted \n @" + auteurMessage.split('@')[0] + " Avoid sending link.";
                        await bot.sendMessage(origineMessage, { text: txt, mentions: [auteurMessage] }, { quoted: ms });
                        await bot.sendMessage(origineMessage, { delete: key });
                        await fs.unlink("st1.webp");
                    } else if (action === 'warn') {
                        const { getWarnCountByJID, ajouterUtilisateurAvecWarnCount } = require('./lib/warn');
                        let warn_count = await getWarnCountByJID(auteurMessage);
                        let max_warn = conf.WARN_COUNT;
                        
                        if (warn_count >= max_warn) {
                            var txt = "bot detected;you will be remove because of reaching warn-limit";
                            await bot.sendMessage(origineMessage, { text: txt, mentions: [auteurMessage] }, { quoted: ms });
                            await bot.groupParticipantsUpdate(origineMessage, [auteurMessage], 'remove');
                            await bot.sendMessage(origineMessage, { delete: key });
                        } else {
                            var rest = max_warn - warn_count;
                            var txt = "bot detected, your warn_count was upgrade ;\n rest : " + rest + " ";
                            await ajouterUtilisateurAvecWarnCount(auteurMessage);
                            await bot.sendMessage(origineMessage, { text: txt, mentions: [auteurMessage] }, { quoted: ms });
                            await bot.sendMessage(origineMessage, { delete: key });
                        }
                    }
                }
            } catch (e) {
                console.log("antibot " + e);
            }

            // Command execution
            if (verifCom) {
                const cmd = evt.cm.find(bmwcmd => bmwcmd.nomCom === commande);
                if (cmd) {
                    try {
                        if (conf.MODE.toLocaleLowerCase() != 'yes' && !superUser) return;
                        
                        if (!superUser && origineMessage === auteurMessage && conf.PM_PERMIT === 'yes') {
                            repondre('You don\'t have access to commands here');
                            return;
                        }
                        
                        if (!superUser && verifGroupe) {
                            let etatGroupeBan = await isGroupBanned(origineMessage);
                            if (etatGroupeBan) return;
                        }
                        
                        if (!verifAdmin && verifGroupe) {
                            let etatOnlyAdmin = await isGroupOnlyAdmin(origineMessage);
                            if (etatOnlyAdmin) return;
                        }
                        
                        if (!superUser) {
                            let etatUserBan = await isUserBanned(auteurMessage);
                            if (etatUserBan) {
                                repondre("You are banned from bot commands");
                                return;
                            }
                        }
                        
                        reagir(origineMessage, bot, ms, cmd.reaction);
                        cmd.fonction(origineMessage, bot, zokou);
                        
                    } catch (e) {
                        console.log("😡😡 " + e);
                        bot.sendMessage(origineMessage, { text: "😡😡 " + e }, { quoted: ms });
                    }
                }
            }
        });

        // Group participants update handler
        const { recupevents } = require('./lib/cron');
        bot.ev.on('group-participants.update', async (group) => {
            console.log(group);
            
            let ppgroup;
            try {
                ppgroup = await bot.profilePictureUrl(group.id, 'image');
            } catch {
                ppgroup = '';
            }
            
            try {
                const metadata = await bot.groupMetadata(group.id);
                
                if (group.action == 'add' && await recupevents(group.id, "welcome") == "on") {
                    let msg = "*CASPER WELCOME MESSAGE*";
                    let participants = group.participants;
                    for (let participant of participants) {
                        msg += "\n ❒ *Hey* 🖐️ @" + participant.split('@')[0] + " WELCOME TO OUR GROUP. \n\n";
                    }
                    msg += "❒ *READ THE GROUP DESCRIPTION TO AVOID GETTING REMOVED* ";
                    bot.sendMessage(group.id, { image: { url: ppgroup }, caption: msg, mentions: participants });
                    
                } else if (group.action == 'remove' && await recupevents(group.id, "goodbye") == "on") {
                    let msg = 'one or somes member(s) left group;\n';
                    let participants = group.participants;
                    for (let participant of participants) {
                        msg += '@' + participant.split('@')[0] + '\n';
                    }
                    bot.sendMessage(group.id, { text: msg, mentions: participants });
                    
                } else if (group.action == 'promote' && await recupevents(group.id, "antipromote") == "on") {
                    if (group.author == metadata.owner || group.author == conf.NUMERO_OWNER + "@s.whatsapp.net" || group.author == decodeJid(bot.user.id) || group.author == group.participants[0]) {
                        console.log("Superuser case, doing nothing");
                        return;
                    }
                    
                    await bot.groupParticipantsUpdate(group.id, [group.author, group.participants[0]], 'demote');
                    bot.sendMessage(group.id, {
                        text: '@' + group.author.split('@')[0] + ' has violated the anti-promotion rule, therefore both ' + group.author.split('@')[0] + ' and @' + group.participants[0].split('@')[0] + ' have been removed from administrative rights.',
                        mentions: [group.author, group.participants[0]]
                    });
                    
                } else if (group.action == 'demote' && await recupevents(group.id, "antidemote") == "on") {
                    if (group.author == metadata.owner || group.author == conf.NUMERO_OWNER + "@s.whatsapp.net" || group.author == decodeJid(bot.user.id) || group.author == group.participants[0]) {
                        console.log("Superuser case, doing nothing");
                        return;
                    }
                    
                    await bot.groupParticipantsUpdate(group.id, [group.author], 'demote');
                    await bot.groupParticipantsUpdate(group.id, [group.participants[0]], 'promote');
                    bot.sendMessage(group.id, {
                        text: '@' + group.author.split('@')[0] + ' has violated the anti-demotion rule by removing @' + group.participants[0].split('@')[0] + '. Consequently, he has been stripped of administrative rights.',
                        mentions: [group.author, group.participants[0]]
                    });
                }
            } catch (e) {
                console.error(e);
            }
        });

        // Cron job setup
        async function cron() {
            const cron = require('node-cron');
            const { getCron } = require('./lib/cron');
            let crons = await getCron();
            
            console.log(crons);
            if (crons.length > 0) {
                for (let i = 0; i < crons.length; i++) {
                    if (crons[i].mute_at != null) {
                        let time = crons[i].mute_at.split(':');
                        console.log('Setting up automute for ' + crons[i].group_id + ' at ' + time[0] + ' H ' + time[1]);
                        cron.schedule(time[1] + ' ' + time[0] + ' * * *', async () => {
                            await bot.groupSettingUpdate(crons[i].group_id, 'announcement');
                            bot.sendMessage(crons[i].group_id, {
                                image: { url: './files/chrono.webp' },
                                caption: 'Hello, it\'s time to close the group; sayonara.'
                            });
                        }, { timezone: 'Africa/Nairobi' });
                    }
                    
                    if (crons[i].unmute_at != null) {
                        let time = crons[i].unmute_at.split(':');
                        console.log('Setting up autounmute for ' + time[0] + ' H ' + time[1] + ' ');
                        cron.schedule(time[1] + ' ' + time[0] + ' * * *', async () => {
                            await bot.groupSettingUpdate(crons[i].group_id, 'not_announcement');
                            bot.sendMessage(crons[i].group_id, {
                                image: { url: './files/chrono.webp' },
                                caption: 'Good morning; It\'s time to open the group.'
                            });
                        }, { timezone: 'Africa/Nairobi' });
                    }
                }
            } else {
                console.log('Crons have not been activated');
            }
            return;
        }

        // Handle contacts update
        bot.ev.on('contacts.upsert', async (contacts) => {
            const insertContact = (contacts) => {
                for (const contact of contacts) {
                    if (store.contacts[contact.id]) {
                        Object.assign(store.contacts[contact.id], contact);
                    } else {
                        store.contacts[contact.id] = contact;
                    }
                }
                return;
            };
            insertContact(contacts);
        });

        // Handle connection updates
        bot.ev.on('connection.update', async (con) => {
            const { lastDisconnect, connection } = con;
            
            if (connection === 'connecting') {
                console.log("ℹ️ CASPER is connecting...");
            } else if (connection === 'open') {
                console.log("✅ CASPER Connected to WhatsApp! ☺️");
                console.log("--");
                await baileys.delay(200);
                console.log("------");
                await baileys.delay(300);
                console.log("Connected!!!!");
                console.log("CASPER Md is Online 🕸\n\n");
                console.log("Loading CASPER Commands...\n");
                
                fs.readdirSync(__dirname + '/scs').forEach(file => {
                    if (path.extname(file).toLowerCase() == '.js') {
                        try {
                            require(__dirname + '/scs/' + file);
                            console.log(file + ' Installed Successfully✔️');
                        } catch (e) {
                            console.log(file + ' could not be installed due to : ' + e);
                        }
                        baileys.delay(300);
                    }
                });
                
                baileys.delay(700);
                
                var mode;
                if (conf.MODE.toLowerCase() === 'yes') {
                    mode = "public";
                } else if (conf.MODE.toLowerCase() == 'no') {
                    mode = "private";
                } else {
                    mode = "Message not found";
                }
                
                console.log("Commands Installation Completed ✅");
                await cron();
                
                if (conf.DP.toLowerCase() == 'yes') {
                    let bmwTxt = '\n ⁠⁠⁠⁠\n╭─────────────━┈⊷ \n│🌏 *AI IS CONNECTED*\n╰─────────────━┈⊷\n│💫 PREFIX: *[ ' + prefixe + ' ]*\n│⭕ MODE: *' + mode + '*\n│📍 VERSION: *6.0.3*\n│🤖 BOT NAME: *BMW MD*\n│👨‍💻 OWNER : *SIR IBRAHIM*\n╰─────────────━┈⊷\n*Join WhatsApp Channel For Updates*\n> https://whatsapp.com/channel/0029VaZuGSxEawdxZK9CzM0Y\n                \n                \n                \n ';
                    await bot.sendMessage(bot.user.id, { text: bmwTxt });
                }
                
            } else if (connection == 'close') {
                let raisonDeco = new boom.Boom(lastDisconnect?.error)?.output.statusCode;
                
                if (raisonDeco === baileys.DisconnectReason.badSession) {
                    console.log('Session Invalid');
                } else if (raisonDeco === baileys.DisconnectReason.connectionClosed) {
                    console.log('!!! Connection closed, reconnecting....');
                    startBot();
                } else if (raisonDeco === baileys.DisconnectReason.connectionLost) {
                    console.log('connection error 😞 ,,, trying to reconnect... ');
                    startBot();
                } else if (raisonDeco === baileys.DisconnectReason?.connectionReplaced) {
                    console.log('Connection replaced, a session is already open please close it please !!!');
                } else if (raisonDeco === baileys.DisconnectReason.loggedOut) {
                    console.log('You are disconnected,,, please rescan the qr code please');
                } else if (raisonDeco === baileys.DisconnectReason.restartRequired) {
                    console.log('Restart in progress ▶️');
                    startBot();
                } else {
                    console.log('Restart on error ', raisonDeco);
                    const { exec } = require('child_process');
                    exec('pm2 restart all');
                }
                
                console.log("Connection update " + connection);
                startBot();
            }
        });

        bot.ev.on('creds.update', saveCreds);

        // Add download and save media message method
        bot.downloadAndSaveMediaMessage = async (message, filename = '', attachExtension = true) => {
            let quoted = message.msg ? message.msg : message;
            let mtype = (message.msg || message).mimetype || '';
            let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mtype.split('/')[0];
            
            const stream = await baileys.downloadContentFromMessage(quoted, messageType);
            let buffer = Buffer.from([]);
            
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }
            
            let type = await FileType.fromBuffer(buffer);
            let trueFileName = './' + filename + '.' + type.ext;
            await fs.writeFileSync(trueFileName, buffer);
            return trueFileName;
        };

        // Add await for message method
        bot.awaitForMessage = async (options = {}) => {
            return new Promise((resolve, reject) => {
                if (typeof options !== "object") reject(new Error("Options must be an object"));
                if (typeof options.sender !== "string") reject(new Error("Sender must be a string"));
                if (typeof options.chatJid !== "string") reject(new Error("ChatJid must be a string"));
                if (options.timeout && typeof options.timeout !== "number") reject(new Error("Timeout must be a number"));
                if (options.filter && typeof options.filter !== "function") reject(new Error("Filter must be a function"));
                
                const timeout = options?.timeout || undefined;
                const filter = options?.filter || (() => true);
                let interval = undefined;
                
                let listener = (update) => {
                    let { type, messages } = update;
                    if (type == "notify") {
                        for (let message of messages) {
                            const fromMe = message.key.fromMe;
                            const chatId = message.key.remoteJid;
                            const isGroup = chatId.endsWith('@g.us');
                            const isStatus = chatId == 'status@broadcast';
                            
                            const sender = fromMe ? bot.user.id.replace(/:.*@/g, '@') : isGroup || isStatus ? message.key.participant.replace(/:.*@/g, '@') : chatId;
                            
                            if (sender == options.sender && chatId == options.chatJid && filter(message)) {
                                bot.ev.off('messages.upsert', listener);
                                clearTimeout(interval);
                                resolve(message);
                            }
                        }
                    }
                };
                
                bot.ev.on('messages.upsert', listener);
                if (timeout) {
                    interval = setTimeout(() => {
                        bot.ev.off('messages.upsert', listener);
                        reject(new Error('Timeout'));
                    }, timeout);
                }
            });
        };

        return bot;
    }

    // Watch for file changes and restart
    let file = require.resolve(__filename);
    fs.watchFile(file, () => {
        fs.unwatchFile(file);
        console.log('Update ' + __filename);
        delete require.cache[file];
        require(file);
    });

    startBot();
}, 5000);
