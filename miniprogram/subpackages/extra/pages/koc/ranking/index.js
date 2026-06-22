const MEDALS = ['🥇', '🥈', '🥉']

Page({
  data: {
    myRank: { rank: 12, nickname: '我的小店', earnings: '128.50', orders: 45 },
    list: [
      { rank: 1, nickname: '水果达人小王', earnings: '3,680.00', orders: 186, avatar: '' },
      { rank: 2, nickname: '社区团长李姐', earnings: '2,950.00', orders: 142, avatar: '' },
      { rank: 3, nickname: '健康生活推荐官', earnings: '2,480.00', orders: 118, avatar: '' },
      { rank: 4, nickname: '吃货小分队', earnings: '1,890.00', orders: 95, avatar: '' },
      { rank: 5, nickname: '鲜果铺子', earnings: '1,560.00', orders: 78, avatar: '' },
      { rank: 6, nickname: '宝妈优选', earnings: '1,230.00', orders: 62, avatar: '' },
      { rank: 7, nickname: '厦门鲜生', earnings: '980.00', orders: 51, avatar: '' },
      { rank: 8, nickname: '果果优选', earnings: '820.00', orders: 43, avatar: '' }
    ].map(function(item) {
      item.rankBadge = MEDALS[item.rank - 1] || String(item.rank)
      item.initial = item.nickname.charAt(0)
      return item
    })
  },
  getRankClass(rank) {
    if (rank === 1) return 'rank-1'
    if (rank === 2) return 'rank-2'
    if (rank === 3) return 'rank-3'
    return ''
  }
})
