const { Engine, Render, Runner, Bodies, Composite, Events, Body } = Matter;

// 1. 엔진 및 렌더러 설정
const engine = Engine.create();
const render = Render.create({
    element: document.body,
    engine: engine,
    options: {
        width: 450,
        height: 700,
        wireframes: false, // 이미지를 보려면 false로 설정
        background: '#ffeeb0' // 기본 배경색 (이미지 로드 전)
    }
});

// 배경 이미지 설정 (필요 시 별도 그리기 로직 추가 가능)
render.options.background = 'url(asset/background.png)';

const world = engine.world;

// 2. 벽 생성 (좌, 우, 바닥)
const ground = Bodies.rectangle(225, 690, 450, 20, { isStatic: true, render: { fillStyle: '#8b4513' } });
const leftWall = Bodies.rectangle(5, 350, 10, 700, { isStatic: true, render: { fillStyle: '#8b4513' } });
const rightWall = Bodies.rectangle(445, 350, 10, 700, { isStatic: true, render: { fillStyle: '#8b4513' } });
const topSensor = Bodies.rectangle(225, 50, 450, 2, { isStatic: true, isSensor: true, label: 'topLine', render: { fillStyle: '#ff0000' } });

Composite.add(world, [ground, leftWall, rightWall, topSensor]);

// 3. 과일 데이터 정의 (1단계 ~ 11단계)
const FRUITS = [
    { radius: 20, label: 1 }, { radius: 30, label: 2 }, { radius: 45, label: 3 },
    { radius: 55, label: 4 }, { radius: 70, label: 5 }, { radius: 85, label: 6 },
    { radius: 100, label: 7 }, { radius: 120, label: 8 }, { radius: 140, label: 9 },
    { radius: 160, label: 10 }, { radius: 190, label: 11 }
];

let currentFruit = null;
let isClicking = false;

// 과일 생성 함수
function createFruit(x, y, level, isStatic = false) {
    const fruitData = FRUITS[level - 1];
    const fruit = Bodies.circle(x, y, fruitData.radius, {
        label: `fruit_${level}`,
        isStatic: isStatic,
        restitution: 0.3, // 탄성
        render: {
            sprite: {
                texture: `asset/${level}.png`,
                xScale: (fruitData.radius * 2) / 512, // 이미지 원본 크기에 맞춰 조정 (예: 512px 기준)
                yScale: (fruitData.radius * 2) / 512
            }
        }
    });
    return fruit;
}

// 대기 중인 과일 생성
function spawnFruit() {
    const level = Math.floor(Math.random() * 5) + 1; // 시작은 1~5단계만
    currentFruit = createFruit(225, 50, level, true);
    Composite.add(world, currentFruit);
}

// 4. 이벤트 핸들러 (마우스 이동 및 클릭)
window.addEventListener('mousemove', (e) => {
    if (currentFruit && currentFruit.isStatic) {
        const canvasRect = render.canvas.getBoundingClientRect();
        let x = e.clientX - canvasRect.left;
        x = Math.max(25, Math.min(425, x)); // 벽 안쪽으로 제한
        Body.setPosition(currentFruit, { x: x, y: 50 });
    }
});

window.addEventListener('click', () => {
    if (currentFruit && currentFruit.isStatic) {
        currentFruit.isStatic = false; // 물리 적용
        currentFruit = null;
        setTimeout(spawnFruit, 1000); // 1초 후 다음 과일 생성
    }
});

// 5. 충돌 감지 및 합성 로직
Events.on(engine, 'collisionStart', (event) => {
    event.pairs.forEach((pair) => {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;

        if (bodyA.label.startsWith('fruit_') && bodyA.label === bodyB.label) {
            const level = parseInt(bodyA.label.split('_')[1]);
            
            // 마지막 단계(11단계)면 합쳐지지 않음
            if (level < 11) {
                const newLevel = level + 1;
                const midX = (bodyA.position.x + bodyB.position.x) / 2;
                const midY = (bodyA.position.y + bodyB.position.y) / 2;

                Composite.remove(world, [bodyA, bodyB]);
                Composite.add(world, createFruit(midX, midY, newLevel));
            }
        }
    });
});

// 게임 루프 시작
Render.run(render);
const runner = Runner.create();
Runner.run(runner, engine);
spawnFruit();
