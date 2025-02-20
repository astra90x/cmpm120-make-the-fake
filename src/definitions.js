export let player = {
    physics: { shape: 'circle', mass: 50 },
    size: 56,
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
    }
}

export let enemy = {
    physics: { shape: 'circle', mass: 50 },
    size: 56,
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
    }
}

export let wall = {
    physics: { shape: 'rect' },
    render(cx, width, height) {
        cx.fillStyle(0x999999)
        cx.fillRect(-width / 2, -height / 2, width, height)
        cx.lineStyle(4, 0x444444)
        cx.strokeRect(-width / 2, -height / 2, width, height)
    }
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
    }
}

export let table = {
    physics: { shape: 'circle' },
    size: 90,
    render(cx) {
        cx.fillStyle(0x6e3300)
        cx.lineStyle(4, 0x444444)
        cx.fillCircle(0, 0, 45)
        cx.strokeCircle(0, 0, 45)
    }
}
