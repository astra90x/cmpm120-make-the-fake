import * as DEFINITIONS from './definitions.js'

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
        this.definition = DEFINITIONS[kind]
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

        let player = this.spawn('player', { x: 100, y: -50 })
        player.grab(this.spawn('knife'))
        player.grab(this.spawn('syringeM99'), true)
        player.grab(this.spawn('plasticWrap'))
        player.grab(this.spawn('slide'))
        player.grab(this.spawn('plasticBag'))

        return player
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
    constructor(cx) {
        this.cx = cx

        this.world = new World()
        this.lastWorldUpdate = -Infinity

        this.player = this.world.populate()

        this.keys = {}
        this.mouse = { x: this.cx.width / 2, y: this.cx.height }
    }

    render(time, delta) {
        this.player.control.move.x = !!this.keys.KeyD - !!this.keys.KeyA
        this.player.control.move.y = !!this.keys.KeyS - !!this.keys.KeyW
        this.player.control.aim = { x: this.mouse.x - this.cx.width / 2, y: this.mouse.y - this.cx.height / 2 }

        let mspt = 0.02 // 50 TPS
        if (this.lastWorldUpdate < time - mspt) {
            this.world.update()
            this.lastWorldUpdate = Math.max(this.lastWorldUpdate + mspt, time - mspt / 2)
        }

        this.cx.startFrame()
        this.renderWorld()
        this.renderInterface()
        this.cx.endFrame()
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

        let tileSize = 400
        let tileXStart = Math.floor(viewLeft / tileSize)
        let tileXEnd = Math.ceil(viewRight / tileSize)
        let tileYStart = Math.floor(viewTop / tileSize)
        let tileYEnd = Math.ceil(viewBottom / tileSize)

        for (let iy = tileYStart; iy < tileYEnd; iy++) {
            for (let ix = tileXStart; ix < tileXEnd; ix++) {
                this.cx.fillStyle(ix >= 0 && ix <= 1 && iy === 0 ? 0x8a6539 : 0x7cb038)
                this.cx.fillRect(ix * tileSize, iy * tileSize, tileSize, tileSize)
            }
        }

        let renderLayers = [[], [], [], []]
        for (let e of this.world.entities.values()) {
            if (e.owner == null) renderLayers[e.definition.renderLayer].push(e)
        }
        for (let layer of renderLayers)
            for (let e of layer) this.renderEntity(e)

        this.cx.restore()
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
    }

    mouseDown() {
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
        item.definition.use?.({ target: closest, self: item, player: this.player })
    }
    mouseMove(mouse) {
        this.mouse = mouse
    }
    mouseUp() {

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
        this.gameLogic = new Game(this.graphics)

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
