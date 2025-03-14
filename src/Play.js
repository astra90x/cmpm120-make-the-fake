import * as PREFABS from './prefabs.js'

const Controller = class {
    constructor(entity, waypoints, world) {
        this.entity = entity
        this.waypoints = waypoints
        this.world = world

        this.currentWaypoint = null
        this.state = 'idle'
    }

    process() {
        if (this.currentWaypoint == null) {
            if (Math.random() < 0.05) this.currentWaypoint = this.waypoints[Math.floor(Math.random() * this.waypoints.length)]
        }

        let move = this.currentWaypoint ? { x: this.currentWaypoint.x - this.entity.x, y: this.currentWaypoint.y - this.entity.y } : { x: 0, y: 0 }
        if (move.x * move.x + move.y * move.y < 20) this.currentWaypoint = null
        return { move, aim: move }
    }
}

const Entity = class {
    constructor(id, kind, options = {}) {
        this.id = id

        this.x = NaN
        this.y = NaN
        this.velocity = { x: 0, y: 0 }
        this.angle = 0
        this.kind = ''
        this.definition = null
        this.size = null
        this.height = null
        this.health = 1
        this.define(kind, options)

        this.incomingDamage = 0
        this.incomingDestruction = false
        this.control = {
            move: { x: 0, y: 0 },
            aim: { x: 0, y: 0 },
        }
        this.controller = null

        this.effects = new Map()

        this.owner = null
        this.inventory = Array(this.definition.inventorySize ?? 0).fill(null)
        this.inventoryActiveIndex = 0
    }

    get width() {
        return this.size
    }

    set width(width) {
        this.size = width
    }

    define(kind, options = {}) {
        if (options.x != null) this.x = options.x
        if (options.y != null) this.y = options.y
        if (options.angle != null) this.angle = options.angle
        this.kind = kind
        this.definition = PREFABS[kind]
        this.size = options.size ?? options.width ?? this.definition.size ?? this.definition.width ?? this.size
        this.height = options.height ?? this.definition.height ?? this.height
    }

    addEffect(effect, duration = Infinity) {
        this.effects.set(effect, Date.now() / 1000 + duration)
    }

    hasEffect(effect) {
        return this.effects.get(effect) > Date.now() / 1000
    }

    inventoryPoint() {
        let { x, y, angle } = this.definition.inventoryActiveAt
        return {
            x: this.x + x * Math.cos(this.angle) - y * Math.sin(this.angle),
            y: this.y + x * Math.sin(this.angle) + y * Math.cos(this.angle),
            angle: this.angle + angle,
        }
    }

    grab(item, active = false) {
        if (item == null) return
        let slot = this.inventory.indexOf(null)
        if (slot === -1) return
        if (item.owner) item.owner.drop(item)
        item.owner = this
        this.inventory[slot] = item
        if (active) this.inventoryActiveIndex = slot
    }

    drop(item = this.inventory[this.inventoryActiveIndex]) {
        if (item == null) return
        let slot = this.inventory.indexOf(item)
        if (slot === -1) return
        item.owner = null
        this.inventory[slot] = null
        let { x, y, angle } = this.inventoryPoint()
        item.x = x
        item.y = y
        item.angle = angle
        item.velocity.x = Math.cos(angle) * 25
        item.velocity.y = Math.sin(angle) * 25
    }

    update() {
        this.health -= this.incomingDamage
        this.incomingDamage = 0
        if (this.health < 0) {
            this.health = 0
        } else if (!(this.health <= 1)) {
            this.health = 1
        }

        if (!this.hasEffect('unconscious') && this.health > 0) {
            if (this.controller != null) {
                this.control = { ...this.control, ...this.controller.process() }
            }

            if (!this.hasEffect('bound')) {
                let factor = Math.max(1, Math.sqrt(this.control.move.x * this.control.move.x + this.control.move.y * this.control.move.y))
                this.velocity.x += this.control.move.x / factor * 5
                this.velocity.y += this.control.move.y / factor * 5
                if (this.control.aim.x || this.control.aim.y) {
                    this.angle = Math.atan2(this.control.aim.y, this.control.aim.x)
                }
            }
        }

        this.x += this.velocity.x * 0.2
        this.y += this.velocity.y * 0.2
        this.velocity.x *= 0.8
        this.velocity.y *= 0.8
    }

    destroy() {
        this.incomingDestruction = true
    }
}

const World = class {
    constructor() {
        this.nextId = 1
        this.entities = new Map()
    }

    spawn(...args) {
        let id = this.nextId++
        let entity = new Entity(id, ...args)
        this.entities.set(id, entity)
        return entity
    }

    populate() {
        this.spawn('fence', { x: -200, y: 0, width: 20, height: 1220 })
        this.spawn('fence', { x: 1000, y: 0, width: 20, height: 1220 })
        this.spawn('fence', { x: 400, y: -600, width: 1180, height: 20 })
        this.spawn('fence', { x: 400, y: 600, width: 1180, height: 20 })

        this.spawn('wall', { x: 135, y: 0, width: 250, height: 20 })
        this.spawn('wall', { x: 565, y: 0, width: 450, height: 20 })
        this.spawn('wall', { x: 0, y: 200, width: 20, height: 420 })
        this.spawn('wall', { x: 400, y: 400, width: 780, height: 20 })
        this.spawn('wall', { x: 800, y: 200, width: 20, height: 420 })
        this.spawn('table', { x: 200, y: 200 })
        this.spawn('couch', { x: 100, y: 200 })
        this.spawn('couch', { x: 200, y: 100, angle: Math.PI / 2 })

        let enemy = this.spawn('enemy', { x: 600, y: 300 })
        enemy.grab(this.spawn('knife'))
        enemy.inventoryActiveIndex = 1
        enemy.controller = new Controller(enemy, [
            { x: 600, y: 300 },
            { x: 400, y: 100 },
            { x: 400, y: 300 },
            { x: 600, y: 100 },
            { x: 300, y: 0 },
        ], this)

        let player = this.spawn('player', { x: 400 + Math.random() * 150, y: -50 - Math.random() * 50 })
        player.grab(this.spawn('knife'))
        player.grab(this.spawn('syringeM99'), true)
        player.grab(this.spawn('plasticWrap'))
        player.grab(this.spawn('smellingSalt'))
        player.grab(this.spawn('slide'))
        player.grab(this.spawn('plasticBag'))

        return [enemy, player]
    }

    update() {
        for (let e of this.entities.values()) e.update()
        let fixed = new Set()
        let dynamic = new Set()
        for (let e of this.entities.values()) {
            if (e.owner != null) continue
            let physics = e.definition.physics
            if (physics == null) continue
            if (physics.mass == null) fixed.add(e)
            else dynamic.add(e)
        }

        for (let a of fixed) {
            for (let b of dynamic) {
                this.collidePair(a, b)
            }
        }
        for (let a of dynamic) {
            for (let b of dynamic) {
                if (a.id > b.id) this.collidePair(a, b)
            }
        }

        for (let [id, e] of this.entities.entries()) {
            if (!e.incomingDestruction) continue
            for (let i of e.inventory) e.drop(i)
            if (e.owner) e.owner.drop(e)
            this.entities.delete(id)
        }
    }

    collidePair(a, b) {
        let aPhysics = a.definition.physics
        let bPhysics = b.definition.physics
        if (aPhysics.shape === 'circle' && bPhysics.shape === 'circle') {
            let dx = a.x - b.x
            let dy = a.y - b.y
            let d2 = dx * dx + dy * dy
            let r = a.size / 2 + b.size / 2
            let r2 = r * r
            if (r2 <= d2) return
            let d = Math.sqrt(d2)
            let push = r - d
            let aFactor = aPhysics.mass == null ? 0 : aPhysics.mass / (aPhysics.mass + bPhysics.mass)
            let udx = dx / d
            let udy = dy / d
            if (Number.isNaN(udx) || Number.isNaN(udy)) {
                udx = Math.random()
                udy = Math.random()
            }
            a.x += udx * push * aFactor
            a.y += udy * push * aFactor
            b.x -= udx * push * (1 - aFactor)
            b.y -= udy * push * (1 - aFactor)
        } else if (aPhysics.shape === 'rect' && bPhysics.shape === 'circle' && aPhysics.mass == null) {
            let x = b.x - a.x
            let y = b.y - a.y
            if (a.angle !== 0) {
                let tmp = x * Math.cos(-a.angle) - y * Math.sin(-a.angle)
                y = x * Math.sin(-a.angle) + y * Math.cos(-a.angle)
                x = tmp
            }
            let r = b.size / 2
            let cx = Math.max(-a.size / 2, Math.min(x, a.size / 2))
            let cy = Math.max(-a.height / 2, Math.min(y, a.height / 2))
            let dx = x - cx
            let dy = y - cy
            let d2 = dx * dx + dy * dy
            if (r * r <= d2) return
            let d = Math.sqrt(d2)
            if (d === 0) {
                if (Math.abs(dx) > Math.abs(dy)) {
                    x = (a.size / 2 + r) * (x > 0 ? 1 : -1)
                } else {
                    y = (a.height / 2 + r) * (y > 0 ? 1 : -1)
                }
            } else {
                let push = r - d
                x += dx / d * push
                y += dy / d * push
            }
            if (a.angle !== 0) {
                let tmp = x * Math.cos(a.angle) - y * Math.sin(a.angle)
                y = x * Math.sin(a.angle) + y * Math.cos(a.angle)
                x = tmp
            }
            b.x = x + a.x
            b.y = y + a.y
        } else {
            throw new Error('Unimplemented collision type')
        }
    }
}

const Game = class {
    constructor(cx, audio) {
        this.cx = cx
        this.audio = audio

        this.menu = ['home']

        this.world = new World()
        this.lastWorldUpdate = -Infinity
        ;[this.enemy, this.player] = this.world.populate()
        this.playerFootstepAt = { x: this.player.x, y: this.player.y, left: false }

        this.hasSave = false

        this.keys = {}
        this.mouse = { x: this.cx.width / 2, y: this.cx.height, clicked: false, down: false }
    }

    reset() {
        this.world = new World()
        this.lastWorldUpdate = -Infinity
        ;[this.enemy, this.player] = this.world.populate()
        this.playerFootstepAt = { x: this.player.x, y: this.player.y, left: false }

        this.hasSave = true
    }

    render(time, delta) {
        this.player.control.move.x = !!this.keys.KeyD - !!this.keys.KeyA
        this.player.control.move.y = !!this.keys.KeyS - !!this.keys.KeyW
        this.player.control.aim = { x: this.mouse.x - this.cx.width / 2, y: this.mouse.y - this.cx.height / 2 }

        let mspt = this.menu.length === 0 ? 0.02 : Infinity // 50 TPS
        if (this.lastWorldUpdate < time - mspt) {
            this.world.update()
            this.lastWorldUpdate = Math.max(this.lastWorldUpdate + mspt, time - mspt / 2)

            if (this.player.y < -400) {
                this.menu.push('completion')
                this.hasSave = false
            }
        }

        this.cx.startFrame()
        if (this.menu[0] !== 'home') {
            this.renderWorld()
            this.renderInterface()
            if (this.menu.length > 0) {
                this.cx.fillStyle(0x483421, 0.3)
                this.cx.fillRect(0, 0, this.cx.width, this.cx.height)
            }
        } else {
            this.cx.fillStyle(0x786451)
            this.cx.fillRect(0, 0, this.cx.width, this.cx.height)
        }
        if (this.menu.length > 0) this.renderMenu()
        this.cx.endFrame()

        this.mouse.clicked = false
    }

    renderEntity(e, at = null) {
        this.cx.save()
        this.cx.translateCanvas(at?.x ?? e.x, at?.y ?? e.y)
        this.cx.rotateCanvas(at == null ? e.angle : at.angle ?? Math.PI * -0.75)
        e.definition.render(this.cx, e)
        if (e.inventory[e.inventoryActiveIndex]) {
            this.renderEntity(e.inventory[e.inventoryActiveIndex], e.definition.inventoryActiveAt)
        }
        this.cx.restore()
    }

    renderWorld() {
        this.cx.save()

        let camera = this.player

        let viewLeft = camera.x - this.cx.width / 2
        let viewTop = camera.y - this.cx.height / 2
        let viewRight = camera.x + this.cx.width / 2
        let viewBottom = camera.y + this.cx.height / 2
        this.cx.translateCanvas(-viewLeft, -viewTop)

        let tileSize = 200
        let tileXStart = Math.floor(viewLeft / tileSize)
        let tileXEnd = Math.ceil(viewRight / tileSize)
        let tileYStart = Math.floor(viewTop / tileSize)
        let tileYEnd = Math.ceil(viewBottom / tileSize)

        for (let iy = tileYStart; iy < tileYEnd; iy++) {
            for (let ix = tileXStart; ix < tileXEnd; ix++) {
                this.cx.fillStyle(
                    ix >= 0 && ix <= 3 && iy >= 0 && iy <= 1 ? 0x8a6539 :
                    ix >= -1 && ix <= 4 && iy >= -3 && iy <= 2 ? 0x7cb038 :
                        0x444444
                )
                this.cx.fillRect(ix * tileSize, iy * tileSize, tileSize + 1, tileSize + 1)
            }
        }

        let renderLayers = [[], [], [], []]
        for (let e of this.world.entities.values()) {
            if (e.owner == null) renderLayers[e.definition.renderLayer].push(e)
        }
        for (let layer of renderLayers)
            for (let e of layer) this.renderEntity(e)

        this.cx.restore()

        let dx = this.playerFootstepAt.x - this.player.x
        let dy = this.playerFootstepAt.y - this.player.y
        if (dx * dx + dy * dy > 75 * 75) {
            this.playerFootstepAt = { x: this.player.x, y: this.player.y, left: !this.playerFootstepAt }
            this.audio.get(`footstep${Math.floor(Math.random() * 4) + 1}${this.playerFootstepAt.left ? 'l' : 'r'}`).play({ volume: 0.1 })
        }
    }

    renderInterface() {
        let { inventory } = this.player
        for (let i = 0; i < inventory.length; i++) {
            let rx = i - (inventory.length - 1) / 2
            this.cx.fillStyle(0x000000, i === this.player.inventoryActiveIndex ? 0.3 : 0.1)
            this.cx.fillRoundedRect(this.cx.width / 2 + rx * 80 - 30, this.cx.height - 80, 60, 60, 8)
            if (inventory[i]) {
                this.renderEntity(inventory[i], { x: this.cx.width / 2 + rx * 80, y: this.cx.height - 50 })
            }
        }

        if (this.menu.length > 0) return

        let active = inventory[this.player.inventoryActiveIndex]
        if (active?.definition.item) {
            this.cx.fillStyle(0x000000)
            this.cx.fillText(this.cx.width / 2 - 300 + 2, this.cx.height - 120 + 2, { width: 600, height: 20 }, active.definition.item)
            this.cx.fillStyle(0xffffff)
            this.cx.fillText(this.cx.width / 2 - 300, this.cx.height - 120, { width: 600, height: 20 }, active.definition.item)
        }

        let has = kind => this.player.inventory.some(x => x?.kind === kind)

        let notice =
            has('bodyBag') ? 'Objective: Exit north to complete your hunt.' :
            this.player.y < -200 ? 'Warning: Your hunt is not complete and will be\nconsidered abandoned if you move further north!' :
            this.enemy.health === 0 ? 'Objective: Collect the body into the plastic bag.' :
            has('slideBlood') ? 'Objective: Stab your victim through the heart.' :
            has('syringeBlood') ? 'Objective: Place the blood sample into\nthe blood slide to make your trophy.' :
            this.enemy.hasEffect('bound') && !this.enemy.hasEffect('unconscious') ? 'Objective: Collect a blood sample with the needle.' :
            this.enemy.hasEffect('bound') ? 'Objective: Wake your victim with the smelling salt.' :
            this.enemy.hasEffect('unconscious') ? 'Objective: Bind your victim with the plastic wrap.' :
                'Objective: Subdue your victim with the tranquilizer.'

        this.cx.fillStyle(0x000000)
        this.cx.fillText(this.cx.width / 2 - 300 + 2, 200 + 2, { width: 600, height: 24 }, notice)
        this.cx.fillStyle(0xffffff)
        this.cx.fillText(this.cx.width / 2 - 300, 200, { width: 600, height: 24 }, notice)
    }

    getScoreSummary() {
        let has = kind => this.player.inventory.some(x => x?.kind === kind)

        let score = this.enemy.health === 0 ? (
            100
                + (has('bodyBag') ? 500 : 0)
                + (has('slideBlood') ? 400 : has('syringeBlood') ? 100 : 0)
        ) : 0

        let summary =
            this.enemy.health > 0 ? 'Try to actually kill your victim...' :
            !has('bodyBag') ? 'Make sure you don\'t leave around\na dead body next time!' :
            !has('slideBlood') ? 'Unfortunately, you don\'t seem to have your trophy.' :
                'Good job! You\'ll be going out sailing soon enough...'

        return `Score: ${score}\n\n${summary}`
    }

    renderMenu() {
        this.cx.fillStyle(0x000000)

        let texts = {
            'controls': 'Use W/A/S/D to move.\nLeft click to use your held item.\nUse 1-8 to switch your held item.\nUse F to pick up items, or Q to drop them.\nPress Escape to open the pause menu.',
            'audio': null,
            'display': `Game resolution: ${this.cx.width}x${this.cx.height}\nScreen resolution: ${screen.width}x${screen.height}`,
            'killers': `You are Dexter Morgan, also known as the Bay\nHarbor Butcher, a blood-spatter analyst working\nat the Miami Metro Police Department, and\nalso a serial killer who kills other serial killers.`,
            'credits': 'Game designed and programmed by Astra Tsai\n\nInspire by the fictional game\nHomicidal Tendencies from the TV series Dexter\n\nSound effects by ZapSplat\nFont designed by Dalton Maag',
            'completion': `${this.enemy.health === 0 ? 'Level complete!' : 'Level abandoned!'}\n\n${this.getScoreSummary()}`,
        }

        let menu = this.menu[this.menu.length - 1]
        let items = menu === 'home' ? [
            { text: 'CONTROLS', click: () => this.menu.push('controls') },
            { text: 'AUDIO', click: () => this.menu.push('audio') },
            { text: 'DISPLAY', click: () => this.menu.push('display') },
            { text: 'KILLERS', click: () => this.menu.push('killers') },
            { text: 'CREDITS', click: () => this.menu.push('credits') },
            // CONFIGURE
            { text: 'NEW GAME', click: () => (this.reset(), this.menu.pop()) },
            // SAVES
            this.hasSave && { text: 'CONTINUE GAME', click: () => this.menu.pop() },
        ] : menu === 'pause' ? [
            { text: 'CONTROLS', click: () => this.menu.push('controls') },
            { text: 'AUDIO', click: () => this.menu.push('audio') },
            { text: 'DISPLAY', click: () => this.menu.push('display') },
            { text: 'KILLERS', click: () => this.menu.push('killers') },
            // CONFIGURE
            { text: 'NEW GAME', click: () => (this.reset(), this.menu.pop()) },
            { text: 'QUIT GAME', click: () => this.menu = ['home'] },
            // SAVES
            { text: 'CLOSE', click: () => this.menu.pop() },
        ] : menu === 'completion' ? [
            { text: 'NEW GAME', click: () => (this.reset(), this.menu.pop()) },
            { text: 'QUIT GAME', click: () => this.menu = ['home'] },
        ] : [
            { text: 'CLOSE', click: () => this.menu.pop() },
        ]

        items = items.filter(x => x)

        this.cx.fillStyle(0x988471)
        this.cx.fillRect(275, 50, this.cx.width - 550, this.cx.height - 175)
        this.cx.lineStyle(4, 0x444444)
        this.cx.strokeRoundedRect(275, 50, this.cx.width - 550, this.cx.height - 175, 2)

        this.cx.fillStyle(0x757a7d)
        this.cx.fillRect(300, 75, 250, this.cx.height - 225)
        this.cx.lineStyle(4, 0x444444)
        this.cx.strokeRoundedRect(300, 75, 250, this.cx.height - 225, 2)

        for (let i = 0; i < items.length; i++) {
            let x = 335
            let y = 75 + (this.cx.height - 225) / 2 + (i - (items.length - 1) / 2) * 70 - 35 / 2
            let w = 175
            let h = 35
            let hover = this.mouse.x >= x && this.mouse.x < x + w && this.mouse.y >= y && this.mouse.y < y + h
            let held = hover && this.mouse.down
            let clicked = hover && this.mouse.clicked

            this.cx.fillStyle(held && hover ? 0x949b92 : hover ? 0xc4cbc2 : 0xb4bbb2)
            this.cx.fillRect(x, y, w, h)
            this.cx.lineStyle(4, 0x444444)
            this.cx.strokeRoundedRect(x, y, w, h, 2)

            this.cx.fillStyle(0x222222)
            this.cx.fillText(x, y + 9, { width: w, height: 16 }, items[i].text)

            if (clicked) items[i].click()
        }

        this.cx.fillStyle(0x757a7d)
        this.cx.fillRect(600, this.cx.height - 300, this.cx.width - 925, 120)
        this.cx.fillStyle(0x444444)
        this.cx.strokeRoundedRect(600, this.cx.height - 300, this.cx.width - 925, 120, 2)

        this.cx.fillStyle(0xb4bbb2)
        this.cx.fillRect(600 + 30, this.cx.height - 300 + 20, this.cx.width - 925 - 90, 120 - 40)
        this.cx.fillStyle(0x444444)
        this.cx.strokeRoundedRect(600 + 30, this.cx.height - 300 + 20, this.cx.width - 925 - 90, 120 - 40, 2)
        this.cx.fillStyle(0x222222)
        this.cx.fillText(600 + 30, this.cx.height - 300 + 27, { width: this.cx.width - 925 - 90, height: 60 }, 'TENDENCIES')
        this.cx.fillStyle(0xff0000, 0.7)
        this.cx.fillText(600 + 30, this.cx.height - 300 - 27, { width: this.cx.width - 925 - 200, height: 80 }, 'Homicidal')

        if (texts[menu] != null) {
            this.cx.fillStyle(0x000000)
            this.cx.fillText(600 + 2, 250 + 2, { width: this.cx.width - 925, height: 28 }, texts[menu])
            this.cx.fillStyle(0xffffff)
            this.cx.fillText(600, 250, { width: this.cx.width - 925, height: 28 }, texts[menu])
        } else if (menu === 'audio') {
            let mute = this.audio.manager.mute

            let x = 600 + (this.cx.width - 925) / 2 - 100
            let y = 300
            let w = 200
            let h = 40
            let hover = this.mouse.x >= x && this.mouse.x < x + w && this.mouse.y >= y && this.mouse.y < y + h
            let held = hover && this.mouse.down
            let clicked = hover && this.mouse.clicked

            this.cx.fillStyle(held && hover ? 0x949b92 : hover ? 0xc4cbc2 : 0xb4bbb2)
            this.cx.fillRect(x, y, w, h)
            this.cx.lineStyle(4, 0x444444)
            this.cx.strokeRoundedRect(x, y, w, h, 2)

            this.cx.fillStyle(0x222222)
            this.cx.fillText(x, y + 9, { width: w, height: 20 }, `Sound: ${mute ? 'OFF' : 'ON'}`)

            if (clicked) {
                this.audio.manager.setMute(!mute)
            }
        } else {
            let x = 600
            let y = 100
            let w = this.cx.width - 925
            let h = this.cx.height - 450

            for (let i = 0; i < 20; i++) {
                let s = 200 / (30 - i)
                let cx = x + w / 2 + (s - 200 / (30 - 20)) * 3
                let cy = y + h / 4 + s * 10

                this.cx.fillStyle(0xcccccc, 0.2)
                this.cx.lineStyle(s / 4, 0x444444)
                this.cx.fillRect(cx - 8 * s, cy - 4 * s, 16 * s, 8 * s)
                this.cx.strokeRoundedRect(cx - 8 * s, cy - 4 * s, 16 * s, 8 * s, 4)
                this.cx.fillStyle(0xcc0000, 0.7)
                this.cx.fillCircle(cx + ((i * Math.PI) % 2 - 1) * 0.4 * s, cy, (3 + 0.2 * ((i * Math.PI * 2) % 2 - 1)) * s)
            }
        }
    }

    mouseDown() {
        this.mouse.down = true

        let item = this.player.inventory[this.player.inventoryActiveIndex]
        if (item == null) return

        let point = this.player.inventoryPoint()
        let closest = null
        let closestD2 = 40 * 40
        for (let e of this.world.entities.values()) {
            if (e === this.player || e.owner != null) continue
            let d2 = (point.x - e.x) * (point.x - e.x) + (point.y - e.y) * (point.y - e.y)
            if (d2 < closestD2) {
                closest = e
                closestD2 = d2
            }
        }
        item.definition.use?.({ target: closest, self: item, player: this.player, audio: this.audio })
    }
    mouseMove(mouse) {
        this.mouse.x = mouse.x
        this.mouse.y = mouse.y
    }
    mouseUp() {
        this.mouse.clicked = true
        this.mouse.down = false
    }
    keyDown(key) {
        this.keys[key] = true
        if (/^Digit[1-8]$/.test(key)) this.player.inventoryActiveIndex = key.charAt(5) - 1
        if (key === 'KeyQ') this.player.drop()
        if (key === 'KeyF') {
            let point = this.player.inventoryPoint()
            let closest = null
            let closestD2 = 40 * 40
            for (let e of this.world.entities.values()) {
                if (e === this.player || e.definition.item == null || e.owner != null) continue
                let d2 = (point.x - e.x) * (point.x - e.x) + (point.y - e.y) * (point.y - e.y)
                if (d2 < closestD2) {
                    closest = e
                    closestD2 = d2
                }
            }
            this.player.grab(closest)
        }
        if (key === 'Escape') {
            if (this.menu[0] === 'home') {
                if (this.menu.length > 1) this.menu.pop()
            } else {
                if (this.menu.length > 0) this.menu.pop()
                else this.menu.push('pause')
            }
        }
    }
    keyUp(key) {
        this.keys[key] = false
    }
}

const Graphics = class extends Phaser.GameObjects.Graphics {
    constructor(scene) {
        super(scene)
        scene.add.displayList.add(this)
        this.width = scene.game.config.width
        this.height = scene.game.config.height
        this.cachedText = new Map()
    }
    startFrame() {
        this.clear()
        this.save()
        for (let cache of this.cachedText.values()) {
            cache.active = 0
        }
    }
    fillStyle(color, alpha = 1) {
        this.cachedFillStyle = { color, alpha }
        super.fillStyle(color, alpha)
    }
    fillText(x, y, { align = 'center', width = 0, height }, text) {
        let { color, alpha } = this.cachedFillStyle

        let cacheKey = [color, height, text].join(' ')
        let cache = this.cachedText.get(cacheKey)
        if (cache == null) {
            cache = { objects: [], active: 0 }
            this.cachedText.set(cacheKey, cache)
        }

        let object
        if (cache.objects.length - cache.active === 0) {
            object = this.scene.add.text(x, y, text, {
                align,
                color: `#${color.toString(16).padStart(6, '0')}`,
                fontFamily: 'Ubuntu',
                fontSize: height,
            })
            cache.objects.push(object)
        } else {
            object = cache.objects[cache.active]
            object.x = x
            object.y = y
            object.text = text
        }
        cache.active++

        object.setAlign(align)
        object.setAlpha(alpha)
        object.setFixedSize(width, 0)
    }
    endFrame() {
        for (let [key, cache] of this.cachedText.entries()) {
            while (cache.objects.length > cache.active) {
                cache.objects.pop().destroy()
            }
            if (cache.active === 0) {
                this.cachedText.delete(key)
            }
        }
    }
}

export const Play = class extends Phaser.Scene {
    constructor() {
        super('Play')
    }

    create() {
        this.graphics = new Graphics(this)
        let ids = ['bag', ['l', 'r'].map(f => ['1', '2', '3', '4'].map(i => `footstep${i}${f}`)), 'gasp', 'stab', 'thud', 'wrap'].flat(Infinity)
        this.audio = new Map(ids.map(id => [id, this.sound.add(id)]))
        this.audio.manager = this.sound
        this.gameLogic = new Game(this.graphics, this.audio)

        this.input.on('pointerdown', e => this.gameLogic.mouseDown(e.position))
        this.input.on('pointermove', e => this.gameLogic.mouseMove(e.position))
        this.input.on('pointerup', e => this.gameLogic.mouseUp(e.position))
        this.input.keyboard.on('keydown', e => !e.repeat && this.gameLogic.keyDown(e.code))
        this.input.keyboard.on('keyup', e => this.gameLogic.keyUp(e.code))
    }

    update(time, delta) {
        this.gameLogic.render(time / 1000, delta / 1000)
    }
}
