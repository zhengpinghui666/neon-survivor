// ═══════════════════════════════════════
// 英雄配置系统
// ═══════════════════════════════════════

export const HEROES = {
  ranger: {
    id: 'ranger',
    name: '脉冲枪手',
    subtitle: 'PULSE RANGER',
    desc: '持续火力最稳定，适合新手',
    color: '#26E7FF',
    colorAlt: '#1AB8CC',
    glowColor: 'rgba(38, 231, 255, 0.3)',
    tags: ['远程', '暴击', '简单'],
    difficulty: 1,
    // 初始武器
    weapon: 'pulseGun',
    // 英雄特性：连续命中同一目标时伤害递增
    trait: {
      id: 'focusFire',
      name: '聚焦射击',
      desc: '连续命中同一目标，伤害逐步+5%，最多+30%'
    },
    // 基础属性修正
    statMod: { attack: 1.0, speed: 1.0, hp: 1.0, critRate: 0.05 },
    // 角色渲染
    render: {
      bodyShape: 'diamond',   // 菱形主体
      coreRadius: 12,
      ringColor: 'rgba(38, 231, 255, 0.2)',
      trailColor: '#26E7FF',
    }
  },

  arcMage: {
    id: 'arcMage',
    name: '电弧术士',
    subtitle: 'ARC MAGE',
    desc: '攻击会连锁，清怪效率很高',
    color: '#B38CFF',
    colorAlt: '#8B6FCC',
    glowColor: 'rgba(179, 140, 255, 0.3)',
    tags: ['范围', '控制', '华丽'],
    difficulty: 2,
    weapon: 'chainArc',
    trait: {
      id: 'shockSpread',
      name: '感电扩散',
      desc: '攻击附带感电，感电敌人死亡时对周围造成伤害'
    },
    statMod: { attack: 0.9, speed: 1.05, hp: 0.9, critRate: 0.03 },
    render: {
      bodyShape: 'circle',    // 圆润漂浮
      coreRadius: 13,
      ringColor: 'rgba(179, 140, 255, 0.2)',
      trailColor: '#B38CFF',
    }
  },

  engineer: {
    id: 'engineer',
    name: '无人机工程师',
    subtitle: 'DRONE ENGINEER',
    desc: '召唤无人机自动协同作战',
    color: '#7BFFD6',
    colorAlt: '#5CCCAA',
    glowColor: 'rgba(123, 255, 214, 0.3)',
    tags: ['召唤', '持续', '辅助'],
    difficulty: 2,
    weapon: 'drone',
    trait: {
      id: 'companionBoost',
      name: '协同增幅',
      desc: '每拥有一个召唤单位，冷却缩短3%，移速+2%'
    },
    statMod: { attack: 0.85, speed: 1.1, hp: 1.05, critRate: 0.02 },
    render: {
      bodyShape: 'hexagon',   // 六边形模块感
      coreRadius: 12,
      ringColor: 'rgba(123, 255, 214, 0.2)',
      trailColor: '#7BFFD6',
    }
  }
};

export const HERO_LIST = Object.values(HEROES);

export function getHero(id) {
  return HEROES[id] || HEROES.ranger;
}
