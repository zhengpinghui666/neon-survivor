// Meta-Progression - persistent upgrades between runs using localStorage

const STORAGE_KEY = 'neon_roguelike_meta';

export const META_UPGRADES = {
    baseHp:      { id: 'baseHp',      nameZh: '基础生命', maxLevel: 10, perLevel: 10,   costBase: 50,  costScale: 50,  icon: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 4C8 4 4 7 4 11c0 5.5 8 10 8 10s8-4.5 8-10c0-4-4-7-8-7z" fill="#ff3366"/></svg>' },
    baseDamage:  { id: 'baseDamage',  nameZh: '基础攻击', maxLevel: 10, perLevel: 2,    costBase: 50,  costScale: 50,  icon: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M14.1 4L4 14.1l2.8 2.8L16.9 6.8 14.1 4zM8.5 18.6L5.4 21.7 2.3 18.6l3.1-3.1 3.1 3.1zM21.7 5.4L18.6 2.3l-3.1 3.1 3.1 3.1 3.1-3.1z" fill="#ffaa00"/></svg>' },
    baseSpeed:   { id: 'baseSpeed',   nameZh: '基础移速', maxLevel: 10, perLevel: 5,    costBase: 40,  costScale: 40,  icon: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 16h6l-1.4 4.2 8.4-8.2H11l2-8L4 16z" fill="#00ccff"/></svg>' },
    baseMagnet:  { id: 'baseMagnet',  nameZh: '起始磁力', maxLevel: 5,  perLevel: 15,   costBase: 60,  costScale: 60,  icon: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M4 6h4v2H4V6zm12 0h4v2h-4V6zM8 6v6a4 4 0 008 0V6h4v6a8 8 0 01-16 0V6h4z" fill="#ff3355"/></svg>' },
    xpBonus:     { id: 'xpBonus',     nameZh: '经验加成', maxLevel: 5,  perLevel: 0.05, costBase: 100, costScale: 100, icon: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8l-6.2 4.5 2.4-7.4L2 9.4h7.6L12 2z" fill="#ffcc00"/></svg>' },
    luckBonus:   { id: 'luckBonus',   nameZh: '幸运值',   maxLevel: 5,  perLevel: 0.03, costBase: 80,  costScale: 80,  icon: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M12 2C9 2 7 5 7 8c0 2 1.5 4 3 5l-1 9h6l-1-9c1.5-1 3-3 3-5 0-3-2-6-5-6z" fill="#44cc66"/><circle cx="12" cy="8" r="2" fill="#88ffaa"/></svg>' },
};

export class MetaProgression {
    constructor() {
        this.gold = 0;
        this.totalGold = 0;
        this.upgrades = {};
        this.load();
    }

    load() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (data) {
                const parsed = JSON.parse(data);
                this.gold = parsed.gold || 0;
                this.totalGold = parsed.totalGold || 0;
                this.upgrades = parsed.upgrades || {};
            }
        } catch (e) {
            console.warn('Failed to load meta progression:', e);
        }
        // Ensure all upgrade keys exist
        for (const key of Object.keys(META_UPGRADES)) {
            if (!(key in this.upgrades)) this.upgrades[key] = 0;
        }
    }

    save() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({
                gold: this.gold,
                totalGold: this.totalGold,
                upgrades: this.upgrades
            }));
        } catch (e) {
            console.warn('Failed to save meta progression:', e);
        }
    }

    getLevel(upgradeId) {
        return this.upgrades[upgradeId] || 0;
    }

    getCost(upgradeId) {
        const def = META_UPGRADES[upgradeId];
        if (!def) return Infinity;
        const level = this.getLevel(upgradeId);
        return def.costBase + def.costScale * level;
    }

    canUpgrade(upgradeId) {
        const def = META_UPGRADES[upgradeId];
        if (!def) return false;
        const level = this.getLevel(upgradeId);
        return level < def.maxLevel && this.gold >= this.getCost(upgradeId);
    }

    purchase(upgradeId) {
        if (!this.canUpgrade(upgradeId)) return false;
        const cost = this.getCost(upgradeId);
        this.gold -= cost;
        this.upgrades[upgradeId] = (this.upgrades[upgradeId] || 0) + 1;
        this.save();
        return true;
    }

    getBonus(upgradeId) {
        const def = META_UPGRADES[upgradeId];
        if (!def) return 0;
        return (this.upgrades[upgradeId] || 0) * def.perLevel;
    }

    addGold(amount) {
        this.gold += amount;
        this.totalGold += amount;
        this.save();
    }

    // Calculate gold earned from a run
    calculateRunGold(killCount, surviveTime, bossKills, comboMax) {
        let gold = 0;
        gold += killCount * 1;                      // 1 gold per kill
        gold += Math.floor(surviveTime / 10) * 5;   // 5 gold per 10s survived
        gold += bossKills * 50;                      // 50 gold per boss
        gold += Math.floor(comboMax / 5) * 10;       // 10 gold per 5-combo
        // Luck bonus
        const luck = this.getBonus('luckBonus');
        gold = Math.floor(gold * (1 + luck));
        return Math.max(1, gold);
    }

    // Get all bonuses for game start
    getStartBonuses() {
        return {
            hp: this.getBonus('baseHp'),
            damage: this.getBonus('baseDamage'),
            speed: this.getBonus('baseSpeed'),
            magnet: this.getBonus('baseMagnet'),
            xpMult: 1 + this.getBonus('xpBonus'),
            luck: this.getBonus('luckBonus')
        };
    }

    resetAll() {
        this.gold = 0;
        this.totalGold = 0;
        this.upgrades = {};
        for (const key of Object.keys(META_UPGRADES)) {
            this.upgrades[key] = 0;
        }
        this.save();
    }
}
