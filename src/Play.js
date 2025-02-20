import * as DEFINITIONS from './definitions.js'

const Entity = class {
    constructor(id, kind, options = {}) {
        this.id = id
        this.x = options.x ?? NaN
        this.y = options.y ?? NaN
        this.angle = options.angle ?? 0
        this.definition = DEFINITIONS[kind]
        this.control = {
            move: { x: 0, y: 0 },
            aim: { x: 0, y: 0 },
        }
        this.size = options.size ?? options.width ?? this.definition.size ?? this.definition.width
        this.height = options.height ?? this.definition.height ?? null
    }

    update() {
        let factor = this.control.move.x && this.control.move.y ? 0.7 : 1
        this.x += this.control.move.x * factor * 5
        this.y += this.control.move.y * factor * 5
        if (this.control.aim.x || this.control.aim.y) {
            this.angle = Math.atan2(this.control.aim.y, this.control.aim.x)
        }
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
        this.spawn('enemy', { x: 600, y: 300 })
        return this.spawn('player', { x: 100, y: -50 })
    }

    update() {
        for (let e of this.entities.values()) e.update()
        let fixed = new Set()
        let dynamic = new Set()
        for (let e of this.entities.values()) {
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
                let tmp = x * Math.cos(a.angle) - y * Math.sin(a.angle)
                y = x * Math.sin(a.angle) + y * Math.cos(a.angle)
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
                let tmp = x * Math.cos(-a.angle) - y * Math.sin(-a.angle)
                y = x * Math.sin(-a.angle) + y * Math.cos(-a.angle)
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
        this.player.control.move.x = !!this.keys.d - !!this.keys.a
        this.player.control.move.y = !!this.keys.s - !!this.keys.w
        this.player.control.aim = { x: this.mouse.x - this.cx.width / 2, y: this.mouse.y - this.cx.height / 2 }

        let mspt = 0.02 // 50 TPS
        if (this.lastWorldUpdate < time - mspt) {
            this.world.update()
            this.lastWorldUpdate = Math.max(this.lastWorldUpdate + mspt, time - mspt / 2)
        }

        this.cx.startFrame()
        this.renderWorld()
        this.cx.endFrame()
    }

    renderEntity(e, at = null) {
        this.cx.save()
        this.cx.translateCanvas(at?.x ?? e.x, at?.y ?? e.y)
        this.cx.rotateCanvas(at == null ? e.angle : at.angle ?? Math.PI * -0.75)
        e.definition.render(this.cx, e.size, e.height, e)
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


        for (let e of this.world.entities.values()) {
            this.renderEntity(e)
        }

        this.cx.restore()
    }

    mouseDown() {

    }
    mouseMove(mouse) {
        this.mouse = mouse
    }
    mouseUp() {

    }
    keyDown(key) {
        this.keys[key] = true
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
        this.input.keyboard.on('keydown', e => !e.repeat && this.gameLogic.keyDown(e.key))
        this.input.keyboard.on('keyup', e => this.gameLogic.keyUp(e.key))
    }

    update(time, delta) {
        this.gameLogic.render(time / 1000, delta / 1000)
    }
}
