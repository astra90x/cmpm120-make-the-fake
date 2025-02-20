export let player = {
    physics: { shape: 'circle', mass: 50 },
    size: 56,
    inventorySize: 8,
    inventoryActiveAt: { x: 30, y: 18, angle: 0 },
    render(cx) {
        cx.fillStyle(0xdf9778)
        cx.lineStyle(4, 0x444444)
        for (let [x, y, radius] of [
            [0, 0, 28],
            [22, -18, 8],
            [22, 18, 8],
        ]) {
            cx.fillCircle(x, y, radius)
            cx.strokeCircle(x, y, radius)
        }
    },
}

export let enemy = {
    physics: { shape: 'circle', mass: 50 },
    size: 56,
    inventorySize: 2,
    inventoryActiveAt: { x: 30, y: 18, angle: 0 },
    render(cx) {
        cx.fillStyle(0xefcab8)
        cx.lineStyle(4, 0x444444)
        for (let [x, y, radius] of [
            [0, 0, 28],
            [22, -18, 8],
            [22, 18, 8],
        ]) {
            cx.fillCircle(x, y, radius)
            cx.strokeCircle(x, y, radius)
        }
    },
}

export let wall = {
    physics: { shape: 'rect' },
    render(cx, width, height) {
        cx.fillStyle(0x999999)
        cx.fillRect(-width / 2, -height / 2, width, height)
        cx.lineStyle(4, 0x444444)
        cx.strokeRect(-width / 2, -height / 2, width, height)
    },
}

export let couch = {
    physics: { shape: 'rect' },
    width: 50,
    height: 90,
    render(cx, width, height) {
        cx.fillStyle(0x76030d)
        cx.fillRect(-width / 2, -height / 2, width, height)
        cx.lineStyle(4, 0x444444)
        cx.strokeRect(-width / 2, -height / 2, width, height)
        let armRest = 14
        cx.strokeRect(-width / 2 + armRest, -height / 2 + armRest, width - armRest, height - armRest * 2)
    },
}

export let table = {
    physics: { shape: 'circle' },
    size: 90,
    render(cx) {
        cx.fillStyle(0x6e3300)
        cx.lineStyle(4, 0x444444)
        cx.fillCircle(0, 0, 45)
        cx.strokeCircle(0, 0, 45)
    },
}

export let knife = {
    item: 'Hunting Knife',
    use({ target }) {
        if (!(target?.kind === 'enemy' && target.health > 0)) return
        target.incomingDamage += target.hasEffect('bound') || target.hasEffect('unconscious') ? 1 : 0.25
    },
    render(cx) {
        cx.fillStyle(0xeeeeee)
        cx.lineStyle(3, 0x444444)
        cx.fillTriangle(0, -4, 0, 4, 12, 0)
        cx.strokeTriangle(0, -4, 0, 4, 12, 0)

        cx.fillStyle(0x111111)
        cx.lineStyle(3, 0x444444)
        cx.fillRect(-8, -4, 8, 8)
        cx.strokeRect(-8, -4, 8, 8)
    },
}

export let syringe = {
    item: 'Syringe',
    use({ target, self }) {
        if (!(target?.kind === 'enemy' && target.health > 0)) return
        target.incomingDamage += 0.005
        self.define('syringeBlood')
    },
    render(cx) {
        cx.fillStyle(0xdddddd, 0.3)
        cx.lineStyle(3, 0x444444)
        cx.fillRect(-8, -4, 14, 8)
        cx.strokeRect(-8, -4, 14, 8)
        cx.fillStyle(0x444444)
        cx.fillTriangle(6, -2, 6, 2, 18, 0)
    },
}

export let syringeM99 = {
    item: 'Syringe of M99',
    use({ target, self }) {
        if (!(target?.kind === 'enemy' && target.health > 0)) return
        target.addEffect('unconscious', 5 * 60)
        self.define('syringe')
    },
    render(cx) {
        cx.fillStyle(0x990099, 0.7)
        cx.lineStyle(3, 0x444444)
        cx.fillRect(-8, -4, 14, 8)
        cx.strokeRect(-8, -4, 14, 8)
        cx.fillStyle(0x444444)
        cx.fillTriangle(6, -2, 6, 2, 18, 0)
    },
}

export let syringeBlood = {
    item: 'Syringe of Blood',
    use({ self, player }) {
        let slide = player.inventory.find(x => x?.kind === 'slide')
        if (slide) {
            slide.define('slideBlood')
            self.define('syringe')
        }
    },
    render(cx) {
        cx.fillStyle(0xcc0000, 0.7)
        cx.lineStyle(3, 0x444444)
        cx.fillRect(-8, -4, 14, 8)
        cx.strokeRect(-8, -4, 14, 8)
        cx.fillStyle(0x444444)
        cx.fillTriangle(6, -2, 6, 2, 18, 0)
    },
}

export let plasticWrap = {
    item: 'Plastic Wrap',
    use({ target, self }) {
        if (!(target?.kind === 'enemy' && target.hasEffect('unconscious'))) return
        target.addEffect('bound')
        self.destroy()
    },
    render(cx) {
        cx.fillStyle(0x6b5531)
        cx.fillRect(-2, -16, 4, 32)
        cx.fillStyle(0xdddddd, 0.5)
        cx.lineStyle(3, 0x444444)
        cx.fillRect(-6, -16, 12, 32)
        cx.strokeRect(-6, -16, 12, 32)
    },
}

export let plasticBag = {
    item: 'Plastic Bag',
    use({ target, self }) {
        if (!(target?.kind === 'enemy' && target.health === 0)) return
        target.destroy()
        self.define('bodyBag')
    },
    render(cx) {
        cx.fillStyle(0x222222, 0.9)
        cx.lineStyle(3, 0x444444)
        cx.fillCircle(6, 0, 16)
        cx.strokeCircle(6, 0, 16)
    },
}

export let bodyBag = {
    item: 'Filled Body Bag',
    render(cx) {
        cx.fillStyle(0xcc0000)
        cx.fillCircle(3, 0, 10)
        cx.fillStyle(0x222222, 0.9)
        cx.lineStyle(3, 0x444444)
        cx.fillCircle(6, 0, 16)
        cx.strokeCircle(6, 0, 16)
    },
}

export let slide = {
    item: 'Empty Blood Slide',
    render(cx) {
        cx.fillStyle(0xcccccc, 0.2)
        cx.lineStyle(3, 0x444444)
        cx.fillRect(-4, -8, 8, 16)
        cx.strokeRect(-4, -8, 8, 16)
    },
}

export let slideBlood = {
    item: 'Filled Blood Slide',
    render(cx) {
        cx.fillStyle(0xcccccc, 0.2)
        cx.lineStyle(3, 0x444444)
        cx.fillRect(-4, -8, 8, 16)
        cx.strokeRect(-4, -8, 8, 16)
        cx.fillStyle(0xcc0000, 0.7)
        cx.fillCircle(0, 0, 3)
    },
}
