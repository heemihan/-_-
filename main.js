const { Engine, Render, Runner, Bodies, Composite, Events, Body } = Matter;

// 1. 엔진 및 렌더러 설정
const engine = Engine.create();
const world = engine.world;

// 렌더러 설정 (기존 body에 직접 생성하는 대신 컨테이너 지정 권장)
const render = Render.create({
    element: document.getElementById('game-container') || document.body,
    engine: engine,
    options: {
        width: 400, // 이전 이미지의 컨테이너 크기에 맞춤
        height: 600,
        wireframes: false,
        background: 'transparent' // 배경은 CSS의 background.png가 보이도록 투명 설정
    }
});

// 2. 벽 생성 (좌, 우, 바닥)
// 게임 영역 GAME_AREA 설정 (이전 대화 기준)
const GAME_AREA = { x: 40, y: 60, width: 320, height: 500 };
const wallThickness = 60;
const wallOptions = { isStatic: true, render: { visible: false } };

const ground = Bodies.rectangle(200, 590, 400, 20, { isStatic: true, render: { visible: false } });
const leftWall = Bodies.rectangle(40, 300, 10, 600, { isStatic: true, render: { visible: false } });
const rightWall = Bodies.rectangle(360, 300, 10, 600, { isStatic: true, render: { visible: false } });
const topSensorY = 100;

Composite.add(world, [ground, leftWall, rightWall]);

// 3. 과일 데이터 정의
const FRUITS = [
    { radius: 20, score: 2 }, { radius: 30, score: 4 }, { radius: 45, score: 8 },
    { radius: 55, score: 16 }, { radius: 70, score: 32 }, { radius: 85, score: 64 },
    { radius: 100, score: 128 }, { radius: 120, score: 256 }, { radius: 140, score: 512 },
    { radius: 160, score: 1024 }, { radius: 190, score: 2048 }
];

let score = 0;
let isGameOver = false;
let currentFruit = null;
let canDrop = true; // 중복 클릭 방지 플래그

// 과일 생성 함수 (파일명 규칙: fruit00.png ~ fruit10.png 준수)
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
                xScale: 1, // 이미지 크기가 반지름과 맞도록 제작되었다고 가정
                yScale: 1
            }
        }
    });
    fruit.isMerging = false; // 합성 중복 방지 플래그 추가
    return fruit;
}

function spawnFruit() {
    if (isGameOver) return;
    const level = Math.floor(Math.random() * 3) + 1; // 1~3단계만 생성
    currentFruit = createFruit(200, 80, level, true);
    Composite.add(world, currentFruit);
    canDrop = true;
}

// 4. 리셋 기능 (이미지 버튼에서 호출됨)
function resetGame() {
    // 모든 과일 제거
    const fruits = Composite.allBodies(world).filter(body => body.label.startsWith('fruit_'));
    Composite.remove(world, fruits);

    // 상태 초기화
    score = 0;
    isGameOver = false;
    currentFruit = null;
    canDrop = true;
    
    const scoreElement = document.getElementById('score');
    if (scoreElement) scoreElement.innerText = '0';
    
    const gameOverElement = document.getElementById('game-over');
    if (gameOverElement) gameOverElement.style.display = 'none';

    spawnFruit();
}

// 전역 스코프에 함수 노출 (HTML에서 onclick으로 접근하기 위함)
window.resetGame = resetGame;

// 5. 이벤트 핸들러
window.addEventListener('mousemove', (e) => {
    if (currentFruit && currentFruit.isStatic && !isGameOver) {
        const canvasRect = render.canvas.getBoundingClientRect();
        let x = e.clientX - canvasRect.left;
        
        // 이동 제한 (벽 두께 고려)
        const radius = FRUITS[parseInt(currentFruit.label.split('_')[1]) - 1].radius;
        x = Math.max(40 + radius, Math.min(360 - radius, x));
        
        Body.setPosition(currentFruit, { x: x, y: 80 });
    }
});

window.addEventListener('click', (e) => {
    // 리셋 버튼 클릭 시에는 과일을 떨어뜨리지 않음
    if (e.target.id === 'reset-btn') return;

    if (currentFruit && canDrop && !isGameOver) {
        canDrop = false;
        Body.setStatic(currentFruit, false);
        currentFruit = null;
        setTimeout(spawnFruit, 1000);
    }
});

// 6. 합성 로직 (중복 방지 로직 포함)
Events.on(engine, 'collisionStart', (event) => {
    event.pairs.forEach((pair) => {
        const bodyA = pair.bodyA;
        const bodyB = pair.bodyB;

        if (bodyA.label.startsWith('fruit_') && bodyA.label === bodyB.label) {
            if (bodyA.isMerging || bodyB.isMerging) return;

            const level = parseInt(bodyA.label.split('_')[1]);
            if (level < 11) {
                bodyA.isMerging = true;
                bodyB.isMerging = true;

                const midX = (bodyA.position.x + bodyB.position.x) / 2;
                const midY = (bodyA.position.y + bodyB.position.y
