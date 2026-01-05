const { Engine, Render, Runner, Bodies, Composite, Events, Body } = Matter;

const engine = Engine.create();
const world = engine.world;

const render = Render.create({
    element: document.getElementById('game-container'),
    engine: engine,
    options: {
        width: 400,
        height: 600,
        wireframes: false,
        background: 'transparent'
    }
});

// 배경 설정
document.getElementById('game-container').style.backgroundImage = "url('asset/background.png')";
document.getElementById('game-container').style.backgroundSize = "cover";

// 벽 생성
const wallThickness = 60;
const ground = Bodies.rectangle(200, 595, 400, 20, { isStatic: true, render: { visible: false } });
const leftWall = Bodies.rectangle(40, 300, 10, 600, { isStatic: true, render: { visible: false } });
const rightWall = Bodies.rectangle(360, 300, 10, 600, { isStatic: true, render: { visible: false } });
const topSensorY = 100;

Composite.add(world, [ground, leftWall, rightWall]);

// 과일 데이터
const FRUITS = [
    { radius: 20, score: 2 }, { radius: 30, score: 4 }, { radius: 45, score: 8 },
    { radius: 55, score: 16 }, { radius: 70, score: 32 }, { radius: 85, score: 64 },
    { radius: 100, score: 128 }, { radius: 120, score: 256 }, { radius: 140, score: 512 },
    { radius: 160, score: 1024 }, { radius: 190, score: 2048 }
];

let score = 0;
let isGameOver = false;
let currentFruit = null;
let canDrop = true;

// 캐릭터 생성 함수
function createFruit(x, y, level, isStatic = false) {
    const fruitData = FRUITS[level - 1];
    const indexStr = String(level - 1).padStart(2, '0');
    const fruit = Bodies.circle(x, y, fruitData.radius, {
        label: `fruit_${level}`,
        isStatic: isStatic,
        restitution: 0.3,
        render: {
            sprite: {
                texture: `asset/fruit${indexStr}.png`,
                xScale: 1,
                yScale: 1
            }
        }
    });
    fruit.isMerging = false;
    return fruit;
}

// 다음 캐릭터 대기
function spawnFruit() {
    if (isGameOver) return;
    const level = Math.floor(Math.random() * 3) + 1;
    currentFruit = createFruit(200, 80, level, true);
    Composite.add(world, currentFruit);
    canDrop = true;
}

// 리셋 함수
window.resetGame = function() {
    const fruits = Composite.allBodies(world).filter(b => b.label && b.label.startsWith('fruit_'));
    Composite.remove(world, fruits);
    score = 0;
    isGameOver = false;
    currentFruit = null;
    canDrop = true;
    document.getElementById('score').innerText = '0';
    document.getElementById('game-over').style.display = 'none';
    spawnFruit();
}

// --- 캐릭터 조작 및 낙하 로직 ---

// 1. 마우스 이동에 따라 캐릭터 위치 이동
window.addEventListener('mousemove', (e) => {
    if (
