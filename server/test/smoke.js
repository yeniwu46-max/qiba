/**
 * 棋霸服务端冒烟测试（不启 HTTP，直接 require 模块）
 * 覆盖：房间创建、换位、聊天去重、背包发奖
 */
const path = require('path');
const fs = require('fs');
const os = require('os');

// 使用临时目录，避免污染正式 stats / rooms
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qiba-smoke-'));
process.env.QIBA_DATA_DIR = tmpDir;

// stats 在模块加载时固定 DATA_DIR；通过 monkey-patch 其内部路径较难，
// 这里直接跑正式 data，但用唯一 uid/昵称，副作用可接受。
const { RoomManager, normalizeJoinPass, starterProps, ALLOWED_EMOTES } = require('../src/room');
const {
  recordOutcome,
  giftItem,
  grantItem,
  takeAnyItems,
  getProfileById,
  recordRecentMatch,
  getRecentMatches,
  recordDailyGame,
  recordDailySpectate,
  claimDailyTask,
  addFriend,
  removeFriend,
  listFriends,
  ITEM_TYPES,
  getLeaderboard,
  saveProfile,
  upgradeJob,
  inviteMentor,
  respondMentor,
  recordVsOutcome,
  resetRivalry,
  appendLore,
  appendWorldRumor,
  listWorldFeed,
} = require('../src/stats');
const go9 = require('../src/games/go9');
const clubs = require('../src/clubs');
const invites = require('../src/invites');
const { MatchQueue, tryQuickMatch } = require('../src/matchmaking');

let passed = 0;
let failed = 0;

function ok(cond, name) {
  if (cond) {
    passed += 1;
    console.log(`  ✓ ${name}`);
  } else {
    failed += 1;
    console.error(`  ✗ ${name}`);
  }
}

function section(title) {
  console.log(`\n[${title}]`);
}

async function main() {
  console.log('棋霸 smoke tests');
  console.log(`data dir: ${tmpDir}`);

  section('房间创建');
  const manager = new RoomManager();
  const created = manager.create({
    gameType: 'gomoku',
    mode: '1v1',
    name: '烟测房主',
    skin: 'red',
    totalRounds: 1,
    boardScale: 'large',
    turnMs: 30000,
    visibility: 'public',
    uid: 'smoke_host_uid',
    joinPass: 'pass12',
  });
  ok(created.ok, 'create 成功');
  ok(!!created.room && created.room.code.length >= 4, '房间码生成');
  ok(created.room.hasJoinPass(), '口令已设置');
  ok(normalizeJoinPass('ab') === null, '口令过短拒绝');
  ok(normalizeJoinPass('abcd') === 'abcd', '口令合法');

  const listed = manager.listPublicRooms();
  ok(listed.some((r) => r.code === created.room.code && r.hasJoinPass === true), '公开列表标记需口令且不暴露口令');
  ok(listed.every((r) => r.joinPass === undefined && r.password === undefined), '列表无口令字段');

  section('加入与口令');
  const badJoin = manager.join(created.room.code, {
    name: '访客A',
    skin: 'blue',
    uid: 'smoke_guest_a',
    joinPass: 'wrong',
  });
  ok(!badJoin.ok && badJoin.needPass, '错误口令拒绝');
  const goodJoin = manager.join(created.room.code, {
    name: '访客A',
    skin: 'blue',
    uid: 'smoke_guest_a',
    joinPass: 'pass12',
  });
  ok(goodJoin.ok, '正确口令加入');
  const room = created.room;
  ok(room.seats.filter((s) => s.player).length === 2, '双人入座');

  section('换位');
  // 房主去观战席，空出座位 0
  const hostId = created.playerId;
  const guestId = goodJoin.playerId;
  const toSpec = room.switchSeat(hostId, { kind: 'spec', index: 0 });
  ok(toSpec.ok, '房主换到观战席');
  ok(!room.seats[0].player, '座位 0 空出');
  const guestTo0 = room.switchSeat(guestId, { kind: 'seat', index: 0 });
  ok(guestTo0.ok, '访客换到座位 0');
  ok(room.seats[0].player && room.seats[0].player.id === guestId, '访客已在座位 0');

  section('聊天去重');
  room.phase = 'lobby';
  // 把房主拉回座位 1 以便双方都在房
  room.switchSeat(hostId, { kind: 'seat', index: 1 });
  const c1 = room.roomChat(guestId, '你好棋霸');
  ok(c1.ok && c1.chat && c1.chat.id, '聊天消息带 id');
  const c2 = room.roomChat(guestId, '第二句');
  ok(c2.ok && c2.chat.id !== c1.chat.id, '两条消息 id 不同');
  // 客户端去重语义：同 id 不应重复入队
  let log = [];
  function ingest(chat) {
    if (chat.id && log.some((x) => x.id === chat.id)) return false;
    log = [...log, chat];
    return true;
  }
  ok(ingest(c1.chat) === true, '首次写入');
  ok(ingest(c1.chat) === false, '同 id 去重');
  ok(ingest(c2.chat) === true, '不同 id 可写入');
  ok(log.length === 2, '去重后长度正确');

  section('大厅表情贴纸');
  room.phase = 'lobby';
  const heart = room.sendEmote(guestId, 'heart');
  ok(heart.ok && heart.chat && heart.chat.kind === 'emote' && heart.chat.emote === 'heart', '大厅可发爱心贴纸');
  const speechless = room.sendEmote(guestId, 'speechless');
  ok(speechless.ok && speechless.chat.emote === 'speechless', '大厅可发无语贴纸');
  const rose = room.sendEmote(guestId, 'flower');
  ok(rose.ok && rose.chat.emote === 'flower', '大厅可发玫瑰贴纸');
  const unknownEmote = room.sendEmote(guestId, 'not-an-emote');
  ok(!unknownEmote.ok, '未知表情被拒绝');
  ok(ALLOWED_EMOTES.includes('heart') && ALLOWED_EMOTES.includes('speechless'), '新贴纸在允许列表');

  section('背包发奖');
  const donorId = `smoke_donor_${Date.now()}`;
  const recvId = `smoke_recv_${Date.now()}`;
  // 连胜刷饼干
  for (let i = 0; i < 3; i += 1) {
    recordOutcome('烟测赠送者', 'win', { id: donorId });
  }
  const donor = getProfileById(donorId, '烟测赠送者');
  ok((donor.cookies || 0) >= 3, '胜利奖励饼干');
  getProfileById(recvId, '烟测接收者');
  // 构造房间座位绑定 uid 后 gift
  const giftMgr = new RoomManager();
  const gCreate = giftMgr.create({
    name: '烟测赠送者',
    uid: donorId,
    gameType: 'gomoku',
    mode: '1v1',
    visibility: 'private',
  });
  const gJoin = giftMgr.join(gCreate.room.code, {
    name: '烟测接收者',
    uid: recvId,
    joinPass: '',
  });
  const gr = gCreate.room.giftItem(gCreate.playerId, gJoin.playerId, 'cookies');
  ok(gr.ok, '局内赠送饼干成功');
  ok(gr.chat && gr.chat.kind === 'gift', '赠送产生礼物聊天');
  const afterDonor = getProfileById(donorId, '烟测赠送者');
  const afterRecv = getProfileById(recvId, '烟测接收者');
  ok((afterDonor.cookies || 0) === (donor.cookies || 0) - 1, '赠送者饼干 -1');
  ok((afterRecv.cookies || 0) >= 1, '接收者饼干 +1');
  ok(ITEM_TYPES.includes('cookies'), '物品类型存在');

  section('最近对局 + 持久化');
  recordRecentMatch({
    id: donorId,
    name: '烟测赠送者',
    outcome: 'win',
    opponent: { id: recvId, name: '烟测接收者' },
    gameType: 'gomoku',
    mode: '1v1',
    boardScale: 'large',
    totalRounds: 1,
    turnMs: 30000,
  });
  const recent = getRecentMatches({ id: donorId }, 5);
  ok(recent.length >= 1 && recent[0].opponent.name === '烟测接收者', '最近对局已记录');

  const snap = manager.serializeAll();
  ok(snap.rooms.some((r) => r.code === room.code), 'serialize 含房间');
  const mgr2 = new RoomManager();
  const loaded = mgr2.loadFromData(snap);
  ok(loaded.loaded >= 1, 'loadFromData 恢复房间');
  const restored = mgr2.rooms.get(room.code);
  ok(!!restored && restored.hasJoinPass(), '恢复后口令仍在');
  ok(restored.seats.some((s) => s.player), '恢复后座位保留等待重连');

  section('弹幕');
  restored.phase = 'playing';
  restored.board = restored.engine.createBoard();
  const specJoin = mgr2.join(restored.code, {
    name: '观战烟测',
    asSpectator: true,
    uid: 'smoke_spec',
    joinPass: 'pass12',
  });
  ok(specJoin.ok, '观战加入');
  const dm = restored.sendDanmaku(specJoin.playerId, '观战加油！');
  ok(dm.ok && dm.danmaku.kind === 'danmaku', '观战可发弹幕');
  const dm2 = restored.sendDanmaku(specJoin.playerId, '再发一条');
  ok(!dm2.ok, '弹幕冷却生效');

  section('一键匹配');
  const matchMgr = new RoomManager();
  const hostMatch = matchMgr.create({
    name: '匹配房主',
    uid: 'smoke_match_host',
    gameType: 'gomoku',
    mode: '1v1',
    turnMs: 30000,
    visibility: 'public',
  });
  ok(hostMatch.ok, '公开等候房创建');
  const quickJoin = matchMgr.quickMatch({
    gameType: 'gomoku',
    mode: '1v1',
    turnMs: 30000,
    name: '匹配访客',
    uid: 'smoke_match_guest',
    skin: 'blue',
  });
  ok(quickJoin.ok && quickJoin.matched, '快速匹配加入已有房间');
  ok(quickJoin.room.code === hostMatch.room.code, '匹配到同一房间');
  const quickCreate = matchMgr.quickMatch({
    gameType: 'reversi',
    mode: '1v1',
    turnMs: 30000,
    name: '匹配新建',
    uid: 'smoke_match_new',
    skin: 'green',
  });
  ok(quickCreate.ok && !quickCreate.matched, '无兼容房间时不进空房');
  ok(!quickCreate.room, '不创建空房间');

  const q = new MatchQueue();
  const queued = tryQuickMatch(matchMgr, q, {
    gameType: 'go',
    mode: '1v1',
    turnMs: 30000,
    name: '排队甲',
    uid: 'smoke_queue_a',
    skin: 'red',
  });
  ok(queued.ok && queued.queued && !queued.matched, '无人时进入匹配队列');
  ok(!!q.get('smoke_queue_a'), '队列中有甲');
  const paired = tryQuickMatch(matchMgr, q, {
    gameType: 'go',
    mode: '1v1',
    turnMs: 30000,
    name: '排队乙',
    uid: 'smoke_queue_b',
    skin: 'blue',
  });
  ok(paired.ok && paired.matched && paired.via === 'queue', '队列两人配对');
  ok(paired.room && paired.room.seats.filter((s) => s.player).length === 2, '配对后双人入座');
  ok(!q.get('smoke_queue_a') && !q.get('smoke_queue_b'), '配对后队列清空');
  q.enqueue({ uid: 'smoke_queue_c', gameType: 'draughts', mode: '1v1', turnMs: 15000, name: '取消测' });
  ok(q.cancel('smoke_queue_c') && !q.get('smoke_queue_c'), '取消匹配队列');

  section('每日任务');
  const dailyId = `smoke_daily_${Date.now()}`;
  recordDailySpectate({ id: dailyId, name: '烟测每日' });
  let dailyProfile = getProfileById(dailyId, '烟测每日');
  ok((dailyProfile.dailyTasks || []).find((t) => t.id === 'spectate_1').done, '观战任务完成');
  const specClaim = claimDailyTask({ id: dailyId, name: '烟测每日', taskId: 'spectate_1' });
  ok(specClaim.ok && (specClaim.rewards.lollipops || 0) >= 1, '观战任务领取棒棒糖');
  recordDailyGame({ id: dailyId, name: '烟测每日', won: true });
  recordDailyGame({ id: dailyId, name: '烟测每日', won: false });
  recordDailyGame({ id: dailyId, name: '烟测每日', won: false });
  dailyProfile = getProfileById(dailyId, '烟测每日');
  ok((dailyProfile.dailyTasks || []).find((t) => t.id === 'games_3').done, '完成3局任务达成');
  ok((dailyProfile.dailyTasks || []).find((t) => t.id === 'first_win').done, '今日首胜达成');
  ok((dailyProfile.dailyTasks || []).find((t) => t.id === 'all_daily').done, '全部每日任务达成');
  const allClaim = claimDailyTask({ id: dailyId, name: '烟测每日', taskId: 'all_daily' });
  ok(allClaim.ok && (allClaim.rewards.rankProtect || 0) >= 1, '全部每日领取保段卡');

  section('任务完成提示');
  const toastId = `smoke_toast_${Date.now()}`;
  const specOnce = recordDailySpectate({ id: toastId, name: '提示玩家' });
  ok((specOnce.dailyTaskJustCompleted || []).includes('spectate_1'), '观战首次完成提示');
  const specTwice = recordDailySpectate({ id: toastId, name: '提示玩家' });
  ok(!(specTwice.dailyTaskJustCompleted || []).includes('spectate_1'), '重复观战不重复提示');

  section('段位仪式与保段卡');
  const rankId = `smoke_rank_${Date.now()}`;
  const rankedUp = recordOutcome('段位甲', 'win', { id: rankId });
  ok(rankedUp.rank === 2 && rankedUp.rankChange && rankedUp.rankChange.type === 'up', '1胜晋级二阶');
  ok(rankedUp.rankChange.fromLabel === '一阶' && rankedUp.rankChange.toLabel === '二阶', '晋级标签');
  recordDailySpectate({ id: rankId, name: '段位甲' });
  recordDailyGame({ id: rankId, name: '段位甲', won: true });
  recordDailyGame({ id: rankId, name: '段位甲', won: false });
  recordDailyGame({ id: rankId, name: '段位甲', won: false });
  const cardClaim = claimDailyTask({ id: rankId, name: '段位甲', taskId: 'all_daily' });
  ok(cardClaim.ok && (getProfileById(rankId).rankProtect || 0) >= 1, '保段卡入库');
  const protectedLoss = recordOutcome('段位甲', 'loss', { id: rankId });
  ok(protectedLoss.rankChange && protectedLoss.rankChange.type === 'protected', '掉段被保段卡挡住');
  ok(protectedLoss.rank === 2, '保段后仍为二阶');
  ok((protectedLoss.rankProtect || 0) === 0, '保段卡已消耗');
  const dropped = recordOutcome('段位甲', 'loss', { id: rankId });
  ok(dropped.rankChange && dropped.rankChange.type === 'down', '无卡则掉段');
  ok(dropped.rank === 1, '掉至一阶');

  section('解说席');
  const commMgr = new RoomManager();
  const commCreate = commMgr.create({
    name: '解说房主',
    uid: 'smoke_comm_host',
    gameType: 'gomoku',
    mode: '2v2',
    visibility: 'public',
  });
  const commJoin = commMgr.join(commCreate.room.code, {
    name: '现场解说',
    uid: 'smoke_comm_user',
    asCommentator: true,
  });
  ok(commJoin.ok, '解说加入');
  ok(!!commCreate.room.findCommentator(commJoin.playerId), '解说席在位');
  commCreate.room.mode = 'aid';
  commCreate.room.phase = 'playing';
  commCreate.room.board = commCreate.room.engine.createBoard();
  commCreate.room.aidRequest = { seatIndex: 0, requesterId: commCreate.playerId };
  const commAid = commCreate.room.applyPlace(commJoin.playerId, 7, 7, { aid: true });
  ok(!commAid.ok && /解说|代下/.test(commAid.error || ''), '解说不可外援代下');
  const commDm = commCreate.room.sendDanmaku(commJoin.playerId, '精彩！');
  ok(commDm.ok, '解说可发弹幕');

  section('道具赛 2.0 五子棋');
  const propMgr = new RoomManager();
  const propHost = propMgr.create({
    name: '道具房主',
    uid: 'smoke_prop_host',
    gameType: 'gomoku',
    mode: 'props',
    visibility: 'public',
  });
  const propGuest = propMgr.join(propHost.room.code, {
    name: '道具访客',
    uid: 'smoke_prop_guest',
  });
  const propRoom = propHost.room;
  ok(propHost.ok && propGuest.ok, '道具房双人');
  const hostProps = starterProps('gomoku');
  ok(hostProps.forbiddenPoint === 1 && hostProps.fog === 1, '五子棋专属道具库存');
  ok(!hostProps.swallow, '五子棋不再默认吞噬');
  propRoom.setReady(propHost.playerId, true);
  propRoom.setReady(propGuest.playerId, true);
  ok(propRoom.start(propHost.playerId).ok, '道具赛开局');
  const fogEarly = propRoom.useProp(propHost.playerId, 'fog');
  ok(!fogEarly.ok, '无己方落子时迷雾失败');
  ok(propRoom.applyPlace(propHost.playerId, 7, 7).ok, '房主落子');
  const fogOk = propRoom.useProp(propHost.playerId, 'fog');
  ok(fogOk.ok && fogOk.effect === 'fog', '迷雾使用成功');
  const guestView = propRoom.publicState(propGuest.playerId);
  ok(guestView.fogActive === true, '对手视角迷雾生效');
  ok(!guestView.lastMove, '对手看不到上一手');
  ok(guestView.board[7][7] === 0, '对手棋盘隐藏上一手');
  const hostView = propRoom.publicState(propHost.playerId);
  ok(hostView.board[7][7] === 1, '自己仍能看见落子');
  const ban = propRoom.useProp(propHost.playerId, 'forbiddenPoint', { r: 8, c: 8 });
  ok(ban.ok, '禁手点设置成功');
  ok(propRoom.applyPlace(propGuest.playerId, 8, 8).ok === false, '对手不可下禁手点');
  ok(propRoom.applyPlace(propGuest.playerId, 8, 7).ok, '可下其他点');

  section('道具赛 黑白棋');
  const revMgr = new RoomManager();
  const revHost = revMgr.create({
    name: '翻转房主',
    uid: 'smoke_rev_host',
    gameType: 'reversi',
    mode: 'props',
    boardScale: 'large',
  });
  const revGuest = revMgr.join(revHost.room.code, { name: '翻转访客', uid: 'smoke_rev_guest' });
  const revRoom = revHost.room;
  revRoom.setReady(revHost.playerId, true);
  revRoom.setReady(revGuest.playerId, true);
  ok(revRoom.start(revHost.playerId).ok, '黑白棋道具开局');
  const mid = (revRoom.engine.SIZE / 2) | 0;
  const protect = revRoom.useProp(revHost.playerId, 'flipProtect', { r: mid, c: mid - 1 });
  ok(protect.ok, '翻转保护');
  const swap = revRoom.useProp(revHost.playerId, 'forceSwap', {
    r: mid - 1,
    c: mid - 1,
    r2: mid - 1,
    c2: mid,
  });
  ok(swap.ok && swap.effect === 'forceSwap', '强制换位');

  section('人机补位');
  const botMgr = new RoomManager();
  const botHost = botMgr.create({
    name: '补位房主',
    uid: 'smoke_bot_host',
    gameType: 'gomoku',
    mode: '2v2',
    fillBots: true,
  });
  ok(botHost.ok && botHost.room.fillBots, '创建时开启人机补位');
  botHost.room.setReady(botHost.playerId, true);
  const botStart = botHost.room.start(botHost.playerId);
  ok(botStart.ok, '空位补人机后开局');
  ok(botHost.room.seats.every((s) => s.player), '四座均有人');
  ok(botHost.room.seats.filter((s) => s.player && s.player.bot).length === 3, '三名人机');
  const botSeat = botHost.room.seats.find((s) => s.player && s.player.bot);
  botHost.room.turnSeatIndex = botSeat.index;
  botHost.room.turnColor = botSeat.color;
  const fakeBot = botHost.room.botPlace(botSeat.player.id, 7, 7);
  ok(!fakeBot.ok, '人机自己不能 botPlace');
  const humanBot = botHost.room.botPlace(botHost.playerId, 7, 7);
  ok(humanBot.ok, '房主可代人机落子');
  ok(botHost.room.board[7][7] === botSeat.color, '人机棋已落下');
  const autoBot = botHost.room.playBotMove();
  ok(autoBot.ok || /未轮到|不在对局|人机/.test(autoBot.error || ''), '人机随机着有响应');

  section('好友');
  getProfileById('smoke_f1', '烟测好友甲');
  getProfileById('smoke_f2', '烟测好友乙');
  const added = addFriend({
    uid: 'smoke_f1',
    name: '烟测好友甲',
    targetUid: 'smoke_f2',
    targetName: '烟测好友乙',
  });
  ok(added.ok, '添加好友');
  ok(listFriends({ uid: 'smoke_f1' }).some((f) => f.uid === 'smoke_f2'), '好友列表含目标');
  const dup = addFriend({ uid: 'smoke_f1', name: '烟测好友甲', targetUid: 'smoke_f2' });
  ok(!dup.ok, '重复添加拒绝');
  const selfAdd = addFriend({ uid: 'smoke_f1', name: '烟测好友甲', targetUid: 'smoke_f1' });
  ok(!selfAdd.ok, '不能添加自己');
  ok(removeFriend({ uid: 'smoke_f1', targetUid: 'smoke_f2' }).ok, '删除好友');

  section('离线好友邀请');
  getProfileById('smoke_inv_from', '邀请甲');
  getProfileById('smoke_inv_to', '邀请乙');
  addFriend({
    uid: 'smoke_inv_from',
    name: '邀请甲',
    targetUid: 'smoke_inv_to',
    targetName: '邀请乙',
  });
  const savedInv = invites.create({
    fromUid: 'smoke_inv_from',
    fromName: '邀请甲',
    toUid: 'smoke_inv_to',
    roomCode: 'INV1',
    gameType: 'gomoku',
    mode: '1v1',
  });
  ok(savedInv.ok && savedInv.invite.id, '离线邀请已持久化');
  const disk = JSON.parse(fs.readFileSync(path.join(tmpDir, 'invites.json'), 'utf8'));
  ok(disk.invites && disk.invites[savedInv.invite.id], '邀请写入磁盘');
  const onLogin = invites.deliverPayloads('smoke_inv_to');
  ok(onLogin.some((p) => p.inviteId === savedInv.invite.id && p.code === 'INV1'), '上线投递待处理邀请');
  ok(invites.get(savedInv.invite.id), '投递后仍可接受');
  const stale = invites.create({
    fromUid: 'smoke_inv_from',
    fromName: '邀请甲',
    toUid: 'smoke_inv_to',
    roomCode: 'OLD1',
    createdAt: Date.now() - (25 * 60 * 60 * 1000),
  });
  ok(stale.ok, '过期邀请可写入');
  ok(!invites.listForUid('smoke_inv_to').some((i) => i.id === stale.invite.id), '超24小时邀请已过期');
  ok(invites.remove(savedInv.invite.id), '处理后移除邀请');
  ok(!invites.get(savedInv.invite.id), '移除后不可再取');

  section('棋社');
  const clubA = clubs.createClub({ uid: 'smoke_f1', name: '烟测棋社', shortName: '测' });
  ok(clubA.ok && clubA.club.shortName === '测', '创建棋社');
  const clubB = clubs.joinClub({ uid: 'smoke_f2', joinCode: clubA.club.joinCode });
  ok(clubB.ok && clubB.club.memberCount === 2, '加入棋社');
  const mine = clubs.mine('smoke_f1');
  ok(mine && mine.teamScore >= 0, '棋社队分');
  ok(clubs.ranking().some((c) => c.id === clubA.club.id), '棋社榜含该社');
  const tagged = botMgr.create({
    name: '棋社房主',
    uid: 'smoke_f1',
    visibility: 'public',
    clubTag: mine.shortName,
    clubName: mine.name,
    clubId: mine.id,
  });
  const clubListed = botMgr.listPublicRooms();
  ok(clubListed.some((r) => r.code === tagged.room.code && r.clubTag === '测'), '公开房带棋社前缀');
  ok(clubs.leaveClub({ uid: 'smoke_f2' }).ok, '退出棋社');

  section('再来一局续房');
  const remMgr = new RoomManager();
  const remHost = remMgr.create({
    name: '续房主',
    uid: 'smoke_rematch_host',
    gameType: 'gomoku',
    mode: '1v1',
    totalRounds: 1,
    visibility: 'private',
  });
  const remGuest = remMgr.join(remHost.room.code, {
    name: '续访客',
    uid: 'smoke_rematch_guest',
    joinPass: '',
  });
  remHost.room.setReady(remHost.playerId, true);
  remHost.room.setReady(remGuest.playerId, true);
  ok(remHost.room.start(remHost.playerId).ok, '续房对局开始');
  remHost.room.finishRound(1);
  ok(remHost.room.phase === 'seriesEnd' && remHost.room.rematchOpen, '单局结束开启再来一局');
  const remNo = remHost.room.rematchVote(remGuest.playerId, false);
  ok(remNo.ok && remHost.room.phase === 'lobby', '拒绝后回到同一房间大厅');
  ok(remHost.room.seats.filter((s) => s.player).length === 2, '拒绝后续房座位保留');

  remHost.room.setReady(remHost.playerId, true);
  remHost.room.setReady(remGuest.playerId, true);
  ok(remHost.room.start(remHost.playerId).ok, '大厅再次开局');
  const remSpec = remMgr.join(remHost.room.code, {
    name: '续观战',
    asSpectator: true,
    uid: 'smoke_rematch_spec',
    joinPass: '',
  });
  ok(remSpec.ok, '观战加入续房');
  remHost.room.finishRound(2);
  ok(remHost.room.rematchOpen, '再开再来一局投票');
  const remYes = remHost.room.rematchVote(remHost.playerId, true);
  ok(remYes.ok && remYes.started && remHost.room.phase === 'playing', '房主同意后同房开新局');
  ok(remHost.room.gameType === 'gomoku' && remHost.room.totalRounds === 1, '续房沿用原设置');
  ok(remHost.room.spectators.some((s) => s.id === remSpec.playerId), '观战席保留');
  remHost.room.finishRound(1);
  remHost.room.rematchDeadline = Date.now() - 1;
  ok(remHost.room.checkRematchTimeout() && remHost.room.phase === 'lobby', '超时回到大厅');

  const seriesMgr = new RoomManager();
  const serH = seriesMgr.create({
    name: '系列房主',
    uid: 'smoke_series_host',
    totalRounds: 3,
    gameType: 'gomoku',
    mode: '1v1',
  });
  const serG = seriesMgr.join(serH.room.code, { name: '系列访客', uid: 'smoke_series_guest', joinPass: '' });
  serH.room.setReady(serH.playerId, true);
  serH.room.setReady(serG.playerId, true);
  serH.room.start(serH.playerId);
  serH.room.finishRound(1);
  ok(serH.room.phase === 'roundEnd' && !serH.room.rematchOpen, '系列局中途不弹出再来一局');
  ok(!serH.room.rematchVote(serH.playerId, true).ok, '系列中途不能续房投票');

  section('教练模式建议一手');
  const coachMgr = new RoomManager();
  const ch = coachMgr.create({
    name: '教练黑',
    uid: 'smoke_coach_black',
    gameType: 'gomoku',
    mode: '1v1',
  });
  const cw = coachMgr.join(ch.room.code, { name: '教练白', uid: 'smoke_coach_white', joinPass: '' });
  ch.room.setReady(ch.playerId, true);
  ch.room.setReady(cw.playerId, true);
  ch.room.start(ch.playerId);
  const cSpec = coachMgr.join(ch.room.code, {
    name: '教练观众',
    asSpectator: true,
    uid: 'smoke_coach_spec',
    joinPass: '',
  });
  const cComm = coachMgr.join(ch.room.code, {
    name: '教练解说',
    asCommentator: true,
    uid: 'smoke_coach_comm',
    joinPass: '',
  });
  ok(cSpec.ok && cComm.ok, '观战与解说入座');
  const sug = ch.room.coachSuggest(cSpec.playerId, 7, 7);
  ok(sug.ok && sug.hint.r === 7 && sug.hint.c === 7, '观战可建议一手');
  const blackState = ch.room.publicState(ch.playerId);
  const whiteState = ch.room.publicState(cw.playerId);
  ok(blackState.coachHint && blackState.coachHint.r === 7, '当前行棋方收到建议');
  ok(!whiteState.coachHint, '对手 publicState 不含建议');
  ok(!ch.room.coachSuggest(cComm.playerId, 7, 8).ok, '解说不能建议');
  ok(!ch.room.coachSuggest(cw.playerId, 7, 8).ok, '入座玩家不能建议');
  ok(!ch.room.coachSuggest(cSpec.playerId, 8, 8).ok, '建议冷却 3 秒');

  section('友谊赌注结算');
  const stakeLoserId = `smoke_stake_l_${Date.now()}`;
  const stakeWinnerId = `smoke_stake_w_${Date.now()}`;
  for (let i = 0; i < 3; i += 1) recordOutcome('赌注输家', 'win', { id: stakeLoserId, gameType: 'gomoku' });
  const loserBefore = getProfileById(stakeLoserId, '赌注输家');
  const winnerBefore = getProfileById(stakeWinnerId, '赌注赢家');
  ok((loserBefore.cookies || 0) >= 1, '输家预先有饼干');
  const stakeMgr = new RoomManager();
  const stH = stakeMgr.create({
    name: '赌注赢家',
    uid: stakeWinnerId,
    gameType: 'gomoku',
    mode: '1v1',
    visibility: 'private',
    friendshipStake: 'cookies',
  });
  const stG = stakeMgr.join(stH.room.code, {
    name: '赌注输家',
    uid: stakeLoserId,
    joinPass: '',
  });
  ok(stH.room.friendshipStake === 'cookies', '房间记录友谊赌注');
  stH.room.setReady(stH.playerId, true);
  stH.room.setReady(stG.playerId, true);
  stH.room.start(stH.playerId);
  stH.room.finishRound(1);
  const loserAfter = getProfileById(stakeLoserId, '赌注输家');
  const winnerAfter = getProfileById(stakeWinnerId, '赌注赢家');
  ok((loserAfter.cookies || 0) === (loserBefore.cookies || 0) - 1, '结算时输家饼干 -1');
  ok((winnerAfter.cookies || 0) >= (winnerBefore.cookies || 0) + 1, '赢家收到赌注饼干');
  ok((stH.room.chatLog || []).some((c) => c.kind === 'gift' && c.stake), '赌注赠送写入聊天');

  const emptyId = `smoke_stake_empty_${Date.now()}`;
  getProfileById(emptyId, '空包输家');
  const emptyMgr = new RoomManager();
  const emH = emptyMgr.create({
    name: '空包赢家',
    uid: `smoke_stake_ew_${Date.now()}`,
    friendshipStake: 'cakes',
    gameType: 'gomoku',
    mode: '1v1',
  });
  const emG = emptyMgr.join(emH.room.code, { name: '空包输家', uid: emptyId, joinPass: '' });
  emH.room.setReady(emH.playerId, true);
  emH.room.setReady(emG.playerId, true);
  emH.room.start(emH.playerId);
  emH.room.finishRound(1);
  ok((emH.room.chatLog || []).some((c) => c.kind === 'system' && /跳过/.test(c.text)), '无库存则跳过并系统提示');
  ok((getProfileById(emptyId, '空包输家').cakes || 0) === 0, '空背包不会变成负数');

  section('友尽赛真心话');
  const yjWinId = `smoke_yj_w_${Date.now()}`;
  const yjLoseId = `smoke_yj_l_${Date.now()}`;
  grantItem({ id: yjLoseId, name: '友尽输家', item: 'cookies', n: 2 });
  grantItem({ id: yjLoseId, name: '友尽输家', item: 'cakes', n: 2 });
  const yjMgr = new RoomManager();
  const yjH = yjMgr.create({
    name: '友尽赢家',
    uid: yjWinId,
    gameType: 'gomoku',
    mode: 'youjin',
    visibility: 'private',
    totalRounds: 2,
  });
  const yjG = yjMgr.join(yjH.room.code, { name: '友尽输家', uid: yjLoseId, joinPass: '' });
  ok(yjH.room.mode === 'youjin', '友尽赛模式');
  yjH.room.setReady(yjH.playerId, true);
  yjH.room.setReady(yjG.playerId, true);
  ok(yjH.room.start(yjH.playerId).ok, '友尽赛开局');
  yjH.room.finishRound(1);
  ok(yjH.room.phase === 'truth', '局末进入真心话');
  ok(yjH.room.truth && yjH.room.truth.stage === 'pick', '赢家选题阶段');
  ok(yjH.room.truth.choices.length === 3, '提供三道随机题');
  ok(!yjH.room.truthAsk(yjG.playerId, '输家出题').ok, '输家不能出题');
  ok(yjH.room.truthAsk(yjH.playerId, '你刚才是不是故意让我？').ok, '赢家可自拟题目');
  ok(yjH.room.truth.stage === 'answer', '进入作答');
  ok(!yjH.room.truthAnswer(yjH.playerId, '赢家抢答').ok, '赢家不能代答');
  ok(yjH.room.truthAnswer(yjG.playerId, '没有，下次还敢').ok, '输家作答成功');
  ok(yjH.room.phase === 'roundEnd', '答完进入局间');
  ok(yjH.room.truth.answer === '没有，下次还敢', '保留回答');
  ok(yjH.room.nextRound(yjH.playerId).ok, '可开下一局');
  yjH.room.finishRound(1);
  ok(yjH.room.phase === 'truth', '末局仍先真心话');
  const bagBefore = getProfileById(yjLoseId, '友尽输家');
  const cookie0 = bagBefore.cookies || 0;
  const cake0 = bagBefore.cakes || 0;
  ok(yjH.room.truthRefuse(yjG.playerId).ok, '可拒绝作答');
  const bagAfter = getProfileById(yjLoseId, '友尽输家');
  const taken = (cookie0 - (bagAfter.cookies || 0)) + (cake0 - (bagAfter.cakes || 0));
  ok(taken === 3, '拒答扣除 3 件背包物品');
  ok(yjH.room.phase === 'seriesEnd', '真心话结束后系列结算');
  const revYoujin = yjMgr.create({
    name: '黑白友尽',
    gameType: 'reversi',
    mode: 'youjin',
  });
  ok(revYoujin.room.mode === '1v1', '非五子棋友尽赛回落到 1v1');
  const takeEmpty = takeAnyItems({ id: emptyId, name: '空包输家', count: 3 });
  ok(takeEmpty.ok && takeEmpty.taken.length === 0, '空背包扣物不报错');

  section('全能王排行');
  const arId = `smoke_allround_${Date.now()}`;
  recordOutcome('全能测', 'win', { id: arId, gameType: 'gomoku' });
  recordOutcome('全能测', 'win', { id: arId, gameType: 'reversi' });
  const arProfile = getProfileById(arId, '全能测');
  ok((arProfile.gameWins && arProfile.gameWins.gomoku) >= 1, '记录五子胜场');
  ok((arProfile.gameWins && arProfile.gameWins.reversi) >= 1, '记录黑白胜场');
  ok((arProfile.allroundScore || 0) >= 2, '两棋种胜场提高全能分');
  const board = getLeaderboard();
  ok(Array.isArray(board.allround), '排行榜含 allround');
  ok(board.allround.some((r) => r.id === arId && r.allroundScore >= 2), '全能王榜含该玩家');

  section('飞行棋路径与新局清理');
  const flyingEng = require('../src/games/flying').createEngine(2);
  const flyBoard0 = flyingEng.createBoard();
  ok(flyBoard0.lastDice == null && flyBoard0.dice == null && flyBoard0.rolled === false, '新棋盘无骰子残留');
  let flyBoard = flyingEng.roll(flyBoard0, 6).board;
  const takeoff = flyingEng.movePlane(flyBoard, '1-0', 1);
  ok(takeoff.ok && takeoff.path && takeoff.path.length === 1, '出舱路径一步');
  ok(takeoff.from && takeoff.from.loc === 'base', '记录起点');
  flyBoard = takeoff.board;
  flyBoard = flyingEng.roll(flyBoard, 4).board;
  const walk = flyingEng.movePlane(flyBoard, '1-0', 1);
  ok(walk.ok && walk.path.length === 4, '轨道按点数逐步走');
  ok(walk.path[3].loc === walk.dest.loc && walk.path[3].pos === walk.dest.pos, '路径终点等于 dest');

  const flyMgr = new RoomManager();
  const flyHost = flyMgr.create({
    name: '飞测房主',
    uid: `smoke_fly_h_${Date.now()}`,
    gameType: 'flying',
    mode: '1v1',
    totalRounds: 2,
    celestial: false,
  });
  const flyGuest = flyMgr.join(flyHost.room.code, {
    name: '飞测对手',
    uid: `smoke_fly_g_${Date.now()}`,
    joinPass: '',
  });
  flyHost.room.setReady(flyHost.playerId, true);
  flyGuest.room.setReady(flyGuest.playerId, true);
  ok(flyHost.room.start(flyHost.playerId).ok, '飞行棋开局');
  flyHost.room.forbiddenCells = [{ r: 1, c: 1, source: 'test' }];
  flyHost.room.lastMove = { r: 3, c: 3, color: 1 };
  flyHost.room.finishRound(1);
  ok(flyHost.room.nextRound(flyHost.playerId).ok, '飞行棋下一局');
  ok(!flyHost.room.lastMove, '新局清空 lastMove');
  ok(!(flyHost.room.forbiddenCells || []).length, '新局清空禁手点');
  ok(!flyHost.room.lastEffects, '新局清空 lastEffects');
  ok(flyHost.room.board && flyHost.room.board.lastDice == null, '新局清空 lastDice');

  const qcId = `smoke_quick_${Date.now()}`;
  getProfileById(qcId, '快捷语测');
  const savedQc = saveProfile({
    id: qcId,
    name: '快捷语测',
    signature: '',
    quickChats: ['自定义一', '', '自定义三'],
  });
  ok(savedQc.ok && savedQc.profile.quickChats[0] === '自定义一', '自定义快捷语写入档案');
  ok(savedQc.profile.quickChats[1] === '', '空槽保留以便回落到默认');

  section('天象 潮汐与流星');
  const weatherMgr = new RoomManager();
  const tideHost = weatherMgr.create({
    name: '潮汐房主',
    uid: 'smoke_tide_host',
    gameType: 'gomoku',
    mode: 'props',
    visibility: 'public',
    celestial: true,
    weather: 'tide',
  });
  const tideGuest = weatherMgr.join(tideHost.room.code, { name: '潮汐访客', uid: 'smoke_tide_guest' });
  const tideRoom = tideHost.room;
  tideRoom.setReady(tideHost.playerId, true);
  tideRoom.setReady(tideGuest.playerId, true);
  ok(tideRoom.start(tideHost.playerId).ok, '潮汐天象开局');
  ok(tideRoom.weather && tideRoom.weather.id === 'tide', '开局天气为潮汐');
  ok(!tideRoom.applyPlace(tideHost.playerId, 0, 0).ok, '潮汐拒绝边线落子');
  ok(tideRoom.applyPlace(tideHost.playerId, 7, 7).ok, '潮汐允许中央落子');
  const tideListed = weatherMgr.listPublicRooms();
  ok(tideListed.some((r) => r.code === tideRoom.code && r.weather && r.weather.id === 'tide'), '世界列表含天气字段');

  const meteorMgr = new RoomManager();
  const metHost = meteorMgr.create({
    name: '流星房主',
    uid: 'smoke_meteor_host',
    gameType: 'gomoku',
    mode: 'props',
    celestial: true,
    weather: 'meteor',
  });
  const metGuest = meteorMgr.join(metHost.room.code, { name: '流星访客', uid: 'smoke_meteor_guest' });
  const metRoom = metHost.room;
  metRoom.setReady(metHost.playerId, true);
  metRoom.setReady(metGuest.playerId, true);
  ok(metRoom.start(metHost.playerId).ok, '流星天象开局');
  metRoom.event = { kind: 'meteor', r: 7, c: 7 };
  ok(metRoom.applyPlace(metHost.playerId, 7, 7).ok, '踩中流星点');
  ok(metRoom.extraTimeForColor && metRoom.extraTimeForColor.ms >= 8000, '流星额外加时');
  ok(metRoom.event && metRoom.event.kind === 'meteor', '流星刷新新点');

  section('棋灵剧场');
  const spiritMgr = new RoomManager();
  const spHost = spiritMgr.create({
    name: '棋灵房主',
    uid: 'smoke_spirit_host',
    gameType: 'gomoku',
    mode: 'props',
    celestial: false,
  });
  const spGuest = spiritMgr.join(spHost.room.code, { name: '棋灵访客', uid: 'smoke_spirit_guest' });
  const spRoom = spHost.room;
  spRoom.celestial = false;
  spRoom.setReady(spHost.playerId, true);
  spRoom.setReady(spGuest.playerId, true);
  ok(spRoom.start(spHost.playerId).ok, '棋灵房开局');
  ok(spRoom.applyPlace(spHost.playerId, 7, 7).ok, '棋灵房落子');
  spRoom.spirit = { r: 8, c: 8, ownerColor: 1, prevR: 8, prevC: 8 };
  spRoom.applySpiritEffect();
  const spState = spRoom.publicState(spGuest.playerId);
  ok(spState.spirit && spState.spirit.r === 8 && spState.spirit.c === 8, 'publicState 含棋灵位置');
  ok((spRoom.forbiddenCells || []).some((p) => p.r === 8 && p.c === 8 && p.source === 'spirit'), '棋灵占空为禁手');
  ok(!spRoom.applyPlace(spGuest.playerId, 8, 8).ok, '棋灵禁手不可落');

  const revSpiritMgr = new RoomManager();
  const rsH = revSpiritMgr.create({
    name: '啃子房主',
    uid: 'smoke_nibble_host',
    gameType: 'reversi',
    mode: 'props',
    boardScale: 'large',
    celestial: false,
  });
  const rsG = revSpiritMgr.join(rsH.room.code, { name: '啃子访客', uid: 'smoke_nibble_guest' });
  const rsRoom = rsH.room;
  rsRoom.celestial = false;
  rsRoom.setReady(rsH.playerId, true);
  rsRoom.setReady(rsG.playerId, true);
  ok(rsRoom.start(rsH.playerId).ok, '黑白棋棋灵开局');
  const rmid = (rsRoom.engine.SIZE / 2) | 0;
  const nibbleFrom = rsRoom.board[rmid][rmid];
  ok(nibbleFrom === 2, '中心为白子');
  rsRoom.spirit = { r: rmid, c: rmid, ownerColor: 1 };
  rsRoom.applySpiritEffect();
  ok(rsRoom.board[rmid][rmid] === 1, '棋灵啃一口翻成己方');

  section('师徒契约');
  const menId = `smoke_mentor_${Date.now()}`;
  const appId = `smoke_appr_${Date.now()}`;
  getProfileById(menId, '烟测师傅');
  getProfileById(appId, '烟测徒弟');
  const invM = inviteMentor({ fromUid: menId, fromName: '烟测师傅', toUid: appId, toName: '烟测徒弟' });
  ok(invM.ok, '师傅发出收徒邀请');
  const accM = respondMentor({ uid: appId, name: '烟测徒弟', accept: true });
  ok(accM.ok && accM.profile.mentorUid === menId, '徒弟接受后绑定师傅');
  const cakesBefore = getProfileById(menId, '烟测师傅').cakes || 0;
  const rankedAppr = recordOutcome('烟测徒弟', 'win', { id: appId, gameType: 'gomoku' });
  ok(rankedAppr.rankChange && rankedAppr.rankChange.type === 'up', '徒弟首胜晋级');
  ok((getProfileById(menId, '烟测师傅').cakes || 0) >= cakesBefore + 1, '师傅因徒弟晋级获得蛋糕');
  const lineageClub = clubs.createClub({ uid: menId, name: '师门棋社', shortName: '师' });
  ok(lineageClub.ok, '师傅创建棋社');
  ok(clubs.joinClub({ uid: appId, joinCode: lineageClub.club.joinCode }).ok, '徒弟加入棋社');
  const lineageMine = clubs.mine(menId);
  ok((lineageMine.lineage || []).some((p) => p.mentorUid === menId && p.apprenticeUid === appId), '棋社师徒谱含该对');

  section('宿敌');
  const rivA = `smoke_riv_a_${Date.now()}`;
  const rivB = `smoke_riv_b_${Date.now()}`;
  getProfileById(rivA, '宿敌甲');
  getProfileById(rivB, '宿敌乙');
  let lastVs;
  for (let i = 0; i < 3; i += 1) {
    lastVs = recordVsOutcome({
      uid: rivB,
      name: '宿敌乙',
      oppUid: rivA,
      oppName: '宿敌甲',
      outcome: 'loss',
    });
  }
  ok(lastVs.ok && lastVs.unlocked, '连负 3 场解锁宿敌');
  ok(getProfileById(rivB, '宿敌乙').rivals && getProfileById(rivB, '宿敌乙').rivals.uid === rivA, '乙档案记录宿敌甲');
  const rivMgr = new RoomManager();
  const rivH = rivMgr.create({
    name: '宿敌乙',
    uid: rivB,
    gameType: 'gomoku',
    mode: '1v1',
    visibility: 'public',
  });
  const rivJ = rivMgr.join(rivH.room.code, { name: '宿敌甲', uid: rivA, joinPass: '' });
  const rivState = rivH.room.publicState(rivH.playerId);
  ok(rivState.rivalInRoom && rivState.rivalUid === rivA, '房间标记宿敌在场');
  const listedRiv = rivMgr.listPublicRooms();
  ok(listedRiv.some((r) => r.code === rivH.room.code && (r.players || []).some((p) => p.uid === rivA)), '世界列表含对局玩家');
  const grudge = rivH.room.startGrudge(rivH.playerId);
  ok(grudge.ok && rivH.room.totalRounds === 3 && rivH.room.grudgeMatch, '了结强制三番棋');

  section('围棋 2v2 共享气');
  const alliedEng = go9.createEngine(9, { allied: true });
  let gb = alliedEng.createBoard();
  gb = alliedEng.place(gb, 0, 0, 1).board;
  gb = alliedEng.place(gb, 0, 1, 3).board;
  const solo = alliedEng.place(gb, 1, 0, 2);
  ok(solo.ok && gb[0][0] === 1, '只围住一子不能提掉相连队友');
  let capB = alliedEng.createBoard();
  capB = alliedEng.place(capB, 0, 0, 1).board;
  capB = alliedEng.place(capB, 0, 1, 3).board;
  capB = alliedEng.place(capB, 1, 0, 2).board;
  capB = alliedEng.place(capB, 1, 1, 2).board;
  const captured = alliedEng.place(capB, 0, 2, 2);
  ok(captured.ok && captured.captured >= 2, '围住双方相连棋才能提子');
  ok(captured.board[0][0] === 0 && captured.board[0][1] === 0, '甲乙两子一并被提');
  const classic = go9.createEngine(9);
  let cb = classic.createBoard();
  cb = classic.place(cb, 0, 0, 1).board;
  const suicide = classic.place(cb, 0, 1, 1);
  ok(suicide.ok, '1v1 围棋不受 4 色结盟影响');
  const goTeamMgr = new RoomManager();
  const goT = goTeamMgr.create({
    name: '协作黑',
    uid: 'smoke_go_team_a',
    gameType: 'go',
    mode: '2v2',
    fillBots: true,
    boardScale: 'small',
  });
  ok(goT.ok && goT.room.seats.map((s) => s.color).join(',') === '1,2,3,4', '围棋 2v2 四色座位');
  goT.room.setReady(goT.playerId, true);
  ok(goT.room.start(goT.playerId).ok, '协作围棋开局');
  ok(goT.room.engine.allied, '引擎开启结盟气');

  section('认输与强制退出');
  const fqMgr = new RoomManager();
  const fqA = `smoke_fq_a_${Date.now()}`;
  const fqB = `smoke_fq_b_${Date.now()}`;
  const fqRoom = fqMgr.create({
    name: '退出甲',
    uid: fqA,
    gameType: 'gomoku',
    mode: '1v1',
    totalRounds: 3,
    visibility: 'public',
  });
  const fqJoin = fqMgr.join(fqRoom.room.code, { name: '退出乙', uid: fqB, joinPass: '' });
  ok(fqJoin.ok, '强制退出测加入');
  fqRoom.room.setReady(fqRoom.playerId, true);
  fqRoom.room.setReady(fqJoin.playerId, true);
  ok(fqRoom.room.start(fqRoom.playerId).ok, '强制退出测开局');
  const listedGt = fqMgr.listPublicRooms();
  ok(listedGt.some((r) => r.code === fqRoom.room.code && r.gameType === 'gomoku'), '世界列表含棋种');
  const beforeA = getProfileById(fqA, '退出甲');
  const beforeB = getProfileById(fqB, '退出乙');
  const fq = fqRoom.room.forceQuit(fqJoin.playerId);
  ok(fq.ok && fqRoom.room.phase === 'seriesEnd', '强制退出立即结束系列赛');
  ok(fqRoom.room.settleHint && fqRoom.room.settleHint.includes('两负'), '强制退出结算提示');
  const afterA = getProfileById(fqA, '退出甲');
  const afterB = getProfileById(fqB, '退出乙');
  ok((afterB.losses || 0) >= (beforeB.losses || 0) + 2, '强制退出记两负');
  ok((afterB.gameLosses && afterB.gameLosses.gomoku || 0) >= ((beforeB.gameLosses && beforeB.gameLosses.gomoku) || 0) + 2, '两负记在五子棋');
  ok((afterA.wins || 0) >= (beforeA.wins || 0) + 1, '对手记一胜');
  fqMgr.leaveImmediate(fqJoin.playerId);
  ok(fqMgr.rooms.has(fqRoom.room.code), '对手仍留在结算房间');

  const resignMgr = new RoomManager();
  const resignA = `smoke_resign_a_${Date.now()}`;
  const resignB = `smoke_resign_b_${Date.now()}`;
  const resignCreated = resignMgr.create({
    name: '认输甲',
    uid: resignA,
    gameType: 'reversi',
    mode: '1v1',
    totalRounds: 1,
    visibility: 'public',
  });
  const resignJoin = resignMgr.join(resignCreated.room.code, { name: '认输乙', uid: resignB, joinPass: '' });
  resignCreated.room.setReady(resignCreated.playerId, true);
  resignCreated.room.setReady(resignJoin.playerId, true);
  ok(resignCreated.room.start(resignCreated.playerId).ok, '认输测开局');
  const resignBefore = getProfileById(resignB, '认输乙');
  const resignRes = resignCreated.room.resign(resignJoin.playerId);
  ok(resignRes.ok, '认输成功');
  const resignAfter = getProfileById(resignB, '认输乙');
  ok((resignAfter.losses || 0) === (resignBefore.losses || 0) + 1, '认输只记一负');
  ok(resignMgr.rooms.has(resignCreated.room.code) && resignCreated.room.findSeatByPlayer(resignJoin.playerId), '认输后仍在房间');

  section('社交房间 · 职业/庭院/传闻');
  const socialMgr = new RoomManager();
  const socHost = socialMgr.create({
    name: '社交房主',
    uid: 'smoke_social_host',
    gameType: 'gomoku',
    mode: '1v1',
    visibility: 'public',
  });
  const socGuest = socialMgr.join(socHost.room.code, {
    name: '社交访客',
    uid: 'smoke_social_guest',
  });
  const socRoom = socHost.room;
  ok(socHost.ok && socGuest.ok, '社交房双人入座');
  ok(socRoom.garden && socRoom.garden.growth === 0, '房间初始庭院为 0');
  const pickJob = socRoom.setSeatJob(socHost.playerId, 'gardener');
  ok(pickJob.ok && socRoom.seats[0].job === 'gardener', '可选择园丁职业');
  const water = socRoom.useJob(socHost.playerId);
  ok(water.ok && socRoom.garden.growth >= 18, '园丁浇灌庭院');
  socRoom.chatLog = [...(socRoom.chatLog || []), {
    id: 'c1',
    kind: 'text',
    text: '这局要稳一点',
    name: '社交访客',
    playerId: socGuest.playerId,
    at: Date.now(),
  }];
  socRoom.setSeatJob(socHost.playerId, 'archaeologist');
  const dig = socRoom.useJob(socHost.playerId);
  ok(dig.ok && dig.rumor && dig.rumor.text.includes('挖出传闻'), '考古学家发布传闻');
  ok(listWorldFeed(5).some((r) => r.text.includes('挖出传闻')), '世界频道收到传闻');
  ok(getProfileById('smoke_social_host', '社交房主').lore.some((r) => r.text.includes('挖出传闻')), '档案写入传闻');
  socRoom.setReady(socHost.playerId, true);
  socRoom.setReady(socGuest.playerId, true);
  ok(socRoom.start(socHost.playerId).ok, '社交房开局');
  ok(socRoom.applyPlace(socHost.playerId, 7, 7).ok, '房主落子');
  socRoom.setSeatJob(socGuest.playerId, 'spy');
  const peek = socRoom.useJob(socGuest.playerId);
  ok(peek.ok, '间谍偷看上一手');
  const spyState = socRoom.publicState(socGuest.playerId);
  ok(spyState.spyReveal && /上一手/.test(spyState.spyReveal.hint), '间谍视角含上一手提示');
  socRoom.setSeatJob(socHost.playerId, 'chef');
  const treat = socRoom.useJob(socHost.playerId);
  ok(treat.ok && treat.socialBuffs.length >= 1, '厨师发放点心 buff');

  section('职业升级');
  const jobUid = `smoke_job_lv_${Date.now()}`;
  grantItem({ id: jobUid, name: '升级测', item: 'cookies', n: 5 });
  const lv1 = getProfileById(jobUid, '升级测');
  ok(lv1.jobLevels.chef === 1 && lv1.jobCards[0].attrs.length === 3, '职业默认 1 级且有三维');
  const a1 = lv1.jobCards.find((c) => c.id === 'chef').attrs[0].value;
  const up = upgradeJob({ id: jobUid, name: '升级测', job: 'chef' });
  ok(up.ok && up.level === 2, '厨师升到 2 级');
  const lv2 = getProfileById(jobUid, '升级测');
  const a2 = lv2.jobCards.find((c) => c.id === 'chef').attrs[0].value;
  ok(a2 > a1, '升级后属性提高');
  ok((lv2.cookies || 0) === (lv1.cookies || 0) - 1, '升 2 级消耗 1 饼干');
  ok(!upgradeJob({ id: jobUid, name: '升级测', job: 'nope' }).ok, '未知职业拒绝');
  const snapSocial = socialMgr.serializeAll();
  const socialMgr2 = new RoomManager();
  socialMgr2.loadFromData(snapSocial);
  const restoredSocial = socialMgr2.rooms.get(socRoom.code);
  ok(restoredSocial && restoredSocial.garden.growth >= 18, '持久化恢复庭院进度');

  // 清理本进程创建的房间引用（不影响正式盘数据以外的逻辑）
  try {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }

  console.log(`\n结果: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
