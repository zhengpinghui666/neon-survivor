// Weapon Evolution System - manages weapon levels, passives, and evolution
// Each weapon has levels 1-5, requires a specific passive stat to evolve

export const WEAPON_DATA = {
    orbitBlade: {
        id: 'orbitBlade', name: 'Shield Blade', nameZh: '护盾刃',
        maxLevel: 5, level: 0,
        reqPassive: 'armor', reqPassiveNameZh: '护甲',
        evolved: false, evolvedName: 'Void Vortex', evolvedNameZh: '虚空漩涡',
        levelEffects: [
            '获得3把旋转刀刃',
            '+2刀刃，伤害+10%',
            '+2刀刃，伤害+15%',
            '+3刀刃，伤害+20%',
            '+3刀刃，伤害+25%'
        ],
        evolveDesc: '刀刃数量翻倍，回旋飞射'
    },
    lightning: {
        id: 'lightning', name: 'Lightning Chain', nameZh: '闪电链',
        maxLevel: 5, level: 0,
        reqPassive: 'critRate', reqPassiveNameZh: '暴击率',
        evolved: false, evolvedName: 'Storm Judgment', evolvedNameZh: '风暴审判',
        levelEffects: [
            '连锁闪电，3次弹跳',
            '+1弹跳，伤害+5',
            '+1弹跳，伤害+5',
            '+2弹跳，伤害+10',
            '+2弹跳，伤害+10'
        ],
        evolveDesc: '弹跳次数翻倍，优先最远敌人'
    },
    aura: {
        id: 'aura', name: 'Damage Aura', nameZh: '力场光环',
        maxLevel: 5, level: 0,
        reqPassive: 'maxHp', reqPassiveNameZh: '最大生命',
        evolved: false, evolvedName: 'Supernova Field', evolvedNameZh: '超新星力场',
        levelEffects: [
            '对周围敌人持续伤害',
            '范围+20，伤害+2',
            '范围+20，伤害+3',
            '范围+25，伤害+4',
            '范围+30，伤害+5'
        ],
        evolveDesc: '范围翻倍，附加灼烧效果'
    },
    fireTrail: {
        id: 'fireTrail', name: 'Fire Trail', nameZh: '烈焰小径',
        maxLevel: 5, level: 0,
        reqPassive: 'moveSpeed', reqPassiveNameZh: '移速',
        evolved: false, evolvedName: 'Phoenix Blaze', evolvedNameZh: '凤凰烈焰',
        levelEffects: [
            '移动时留下灼烧火焰',
            '伤害+5，火焰更持久',
            '伤害+5，生成更快',
            '伤害+8，火焰更宽',
            '伤害+10，最长火径'
        ],
        evolveDesc: '凤凰尾焰，伤害x3'
    },
    mine: {
        id: 'mine', name: 'Explosive Mine', nameZh: '爆裂雷弹',
        maxLevel: 5, level: 0,
        reqPassive: 'areaSize', reqPassiveNameZh: '效果范围',
        evolved: false, evolvedName: 'Cluster Bomb', evolvedNameZh: '集束炸弹',
        levelEffects: [
            '定期投放爆炸地雷',
            '伤害+15，半径+20',
            '伤害+15，半径+20',
            '伤害+20，投放更快',
            '伤害+25，半径+30'
        ],
        evolveDesc: '爆炸留下毒雾区域'
    },
    shuriken: {
        id: 'shuriken', name: 'Piercing Shuriken', nameZh: '穿透飞镖',
        maxLevel: 5, level: 0,
        reqPassive: 'cooldown', reqPassiveNameZh: '技能急速',
        evolved: false, evolvedName: 'Void Seeker', evolvedNameZh: '虚空追猎者',
        levelEffects: [
            '发射穿透飞镖',
            '穿透+2，伤害+10',
            '穿透+2，伤害+10',
            '穿透+3，伤害+15',
            '穿透+3，伤害+20'
        ],
        evolveDesc: '自动追踪 + 无限穿透'
    }
};

export const PASSIVE_DATA = {
    damage:    { id: 'damage',    nameZh: '攻击力',   level: 0, maxLevel: 5, perLevel: 5,    unit: '' ,  desc: '+{v} 伤害' },
    armor:     { id: 'armor',     nameZh: '护甲',     level: 0, maxLevel: 5, perLevel: 0.05, unit: '%',  desc: '-{v}% 受伤' },
    maxHp:     { id: 'maxHp',     nameZh: '最大生命', level: 0, maxLevel: 5, perLevel: 25,   unit: '',   desc: '+{v} HP' },
    moveSpeed: { id: 'moveSpeed', nameZh: '移速',     level: 0, maxLevel: 5, perLevel: 15,   unit: '',   desc: '+{v} 速度' },
    critRate:  { id: 'critRate',  nameZh: '暴击率',   level: 0, maxLevel: 5, perLevel: 0.08, unit: '%',  desc: '+{v}% 暴击' },
    cooldown:  { id: 'cooldown',  nameZh: '技能急速', level: 0, maxLevel: 5, perLevel: 0.08, unit: '%',  desc: '-{v}% CD' },
    areaSize:  { id: 'areaSize',  nameZh: '效果范围', level: 0, maxLevel: 5, perLevel: 0.15, unit: '%',  desc: '+{v}% 范围' },
    magnetRange:{ id: 'magnetRange', nameZh: '拾取范围', level: 0, maxLevel: 5, perLevel: 30, unit: '', desc: '+{v} 磁力' }
};

export class WeaponEvolutionManager {
    constructor() {
        this.weapons = {};
        this.passives = {};
        this.reset();
    }

    reset() {
        // Deep copy data
        this.weapons = {};
        for (const [k, v] of Object.entries(WEAPON_DATA)) {
            this.weapons[k] = { ...v, level: 0, evolved: false };
        }
        this.passives = {};
        for (const [k, v] of Object.entries(PASSIVE_DATA)) {
            this.passives[k] = { ...v, level: 0 };
        }
    }

    getWeapon(id) { return this.weapons[id]; }
    getPassive(id) { return this.passives[id]; }

    upgradeWeapon(id) {
        const w = this.weapons[id];
        if (!w || w.level >= w.maxLevel) return false;
        w.level++;
        return true;
    }

    upgradePassive(id) {
        const p = this.passives[id];
        if (!p || p.level >= p.maxLevel) return false;
        p.level++;
        return true;
    }

    canEvolve(weaponId) {
        const w = this.weapons[weaponId];
        if (!w || w.evolved || w.level < w.maxLevel) return false;
        const reqPassive = this.passives[w.reqPassive];
        return reqPassive && reqPassive.level >= 1;
    }

    evolve(weaponId) {
        const w = this.weapons[weaponId];
        if (!this.canEvolve(weaponId)) return false;
        w.evolved = true;
        return true;
    }

    getEvolvableWeapons() {
        return Object.keys(this.weapons).filter(id => this.canEvolve(id));
    }

    // Get total passive bonus for a stat
    getPassiveBonus(id) {
        const p = this.passives[id];
        if (!p) return 0;
        return p.level * p.perLevel;
    }

    // Get available upgrade options for level-up screen
    getUpgradeOptions() {
        const options = [];

        // Weapon upgrades (unlocked weapons that aren't max level)
        for (const [id, w] of Object.entries(this.weapons)) {
            if (w.level > 0 && w.level < w.maxLevel) {
                options.push({
                    type: 'weaponUpgrade', weaponId: id,
                    name: w.nameZh, level: w.level, maxLevel: w.maxLevel,
                    desc: w.levelEffects[w.level],
                    category: 'weapon'
                });
            }
        }

        // New weapons (level == 0)
        for (const [id, w] of Object.entries(this.weapons)) {
            if (w.level === 0) {
                options.push({
                    type: 'weaponNew', weaponId: id,
                    name: w.nameZh, level: 0, maxLevel: w.maxLevel,
                    desc: w.levelEffects[0],
                    category: 'newWeapon'
                });
            }
        }

        // Passive upgrades
        for (const [id, p] of Object.entries(this.passives)) {
            if (p.level < p.maxLevel) {
                const val = p.perLevel >= 1 ? p.perLevel : Math.round(p.perLevel * 100);
                options.push({
                    type: 'passive', passiveId: id,
                    name: p.nameZh, level: p.level, maxLevel: p.maxLevel,
                    desc: p.desc.replace('{v}', val),
                    category: 'passive'
                });
            }
        }

        // Heal option (always available)
        options.push({
            type: 'heal',
            name: '生命回复', level: 0, maxLevel: 0,
            desc: '恢复30点HP',
            category: 'heal'
        });

        return options;
    }
}
