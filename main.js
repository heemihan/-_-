const { Engine, Render, Runner, Bodies, Composite, Events, Body } = Matter;

const engine = Engine.create();
const world = engine.world;

// 1. 렌더러 설정: 컨테이너 크기에 딱 맞춤
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

// 2. 벽 생성: 게임 영역 바깥으로 보이지 않게 배치
const wallOptions = { isStatic: true, render: { visible: false } };
const ground = Bodies.rectangle(200, 595, 400, 10, wallOptions);
const leftWall = Bodies.rectangle(40, 300, 10, 600, wallOptions);
const rightWall = Bodies.rectangle(360, 300, 10, 600, wallOptions);
const topSensorY = 100; // 게임오버 기준선

Composite.add(world, [ground, leftWall, rightWall]);

// 3. 데이터 및 상태 변수
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

// 캐릭터(과일) 생성 함수 수정
function createFruit(x, y, level, isStatic = false) {
    const fruitData = FRUITS[level - 1];
    
    // 파일명 규칙: fruit00.png, fruit01.png ...
    // level이 1일 때 '00', level이 2일 때 '01'이 되도록 설정
    const indexStr = String(level - 1).padStart(2, '0'); 
    const texturePath = `asset/fruit${indexStr}.png`; // 'fruit' 접두어 추가

    const fruit = Bodies.circle(x, y, fruitData.radius, {
        label: `fruit_${level}`,
        isStatic: isStatic,
        restitution: 0.3,
        render: {
            sprite: {
                texture: texturePath, // 수정된 경로 적용
                xScale: 1, // 이미지 크기에 맞춰 조절 (이미지가 크면 0.5 등으로 조절)
                yScale: 1
            }
        }
    });
    fruit.isMerging = false;
    return fruit;
}
}

function spawnFruit() {
    if (isGameOver) return;
    const level = Math.floor(Math.random() * 3) + 1;
    currentFruit = createFruit(200, 80, level, true);
    Composite.add(world, currentFruit);
    canDrop = true;
}

// 5. 리셋 함수: 전역(window)에 등록하여 HTML에서 호출 가능하게 함
window.resetGame = function() {
    const fruits = Composite.allBodies(world).filter(b => b.label && b.label.startsWith('fruit_'));
    Composite.remove(world, fruits);
    score = 0;
    isGameOver = false;
    document.getElementById('score').innerText = '0';
    document.getElementById('game-over').style.display = 'none';
    spawnFruit();
}

// 6. 마우스 이동 처리: 벽(40~360) 사이에서만 이동
window.addEventListener('mousemove', (e) => {
    if (currentFruit && currentFruit.isStatic && !isGameOver) {
        const rect = render.canvas.getBoundingClientRect();
        let x = e.clientX - rect.left;
        
        const radius = FRUITS[parseInt(currentFruit.label.split('_')[1]) - 1].radius;
        // 캐릭터가 좌우 벽(40, 360)을 뚫고 나가지 않게 제한
        x = Math.max(40 + radius, Math.min(360 - radius, x));
        
        Body.setPosition(currentFruit, { x: x, y: 80 });
    }
});

// 7. 클릭 처리: 리셋 버튼 클릭 시에는 무시
window.addEventListener('click', (e) => {
    // 클릭한 요소의 ID가 reset-btn이면 과일을 떨어뜨리지 않음
    if (e.target.id === 'reset-btn') return;

    if
