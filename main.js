const { Engine, Render, Runner, Bodies, Composite, Events, Body } = Matter;

const engine = Engine.create();
const world = engine.world;
const container = document.getElementById('game-container');

// 1. 렌더러 설정
const render = Render.create({
    element: container,
    engine: engine,
    options: {
        width: 400,
        height: 600,
        wireframes: false,
        background: 'transparent'
    }
});

// 2. 벽 생성
const wallOptions = { isStatic: true, render: { visible: false } };
const ground = Bodies.rectangle(200, 595, 400, 10, wallOptions);
const leftWall = Bodies.rectangle(40, 300, 10, 600, wallOptions);
const rightWall = Bodies.rectangle(360, 300, 10, 600, wallOptions);
const topSensorY = 100; 

Composite.add(world, [ground, leftWall, rightWall]);

// 3. 데이터 및 상태 변수
const FRUITS = [
    { radius: 19, score: 2 }, { radius: 29, score: 4 }, { radius: 44, score: 8 },
    { radius: 54, score: 16 }, { radius: 69, score: 32 }, { radius: 84, score: 64 },
    { radius: 99, score: 128 }, { radius: 119, score: 256 }, { radius: 139, score: 512 },
    { radius: 159, score: 1024 }, { radius: 189, score: 2048 }
];

let score = 0;
let isGameOver = false;
let currentFruit = null;
let canDrop = true;
let isDragging = false;

// 4. 과일 생성 함수
function createFruit(x, y, level, isStatic = false) {
    const fruitData = FRUITS[level - 1];
    const indexStr = String(level - 1).padStart(2, '0');
    const texturePath = `asset/fruit${indexStr}.png`; 

    const fruit = Bodies.circle(x, y, fruitData.radius, {
        label: `fruit_${level}`,
        isStatic: isStatic,
        restitution: 0.3,
        render: {
            sprite: { texture: texturePath, xScale: 1, yScale: 1 }
        }
    });
    fruit.isMerging = false;
    return fruit;
}

function spawnFruit() {
    if (isGameOver) return;
    const level = Math.floor(Math.random() * 3) + 1;
    currentFruit = createFruit(200, 80, level, true);
    Composite.add(world, currentFruit);
    canDrop = true;
}

// 5. 효과음 및 유틸리티 함수
function playSound(id) {
    const sound = document.getElementById(id);
    if (sound) {
        sound.currentTime = 0;
        sound.play().catch(() => {});
    }
}

function getInputX(e) {
    const rect = container.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    return clientX - rect.left;
}

// 6. 조작 로직 (터치 유지 시 이동, 떼면 낙하)
let isDragging = false; 

// 좌표 계산 함수 보강
function getInputX(e) {
    const rect = container.getBoundingClientRect();
    // 터치 이벤트와 마우스 이벤트를 명확히 구분하여 좌표 추출
    let clientX;
    if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
    } else {
        clientX = e.clientX;
    }
    return clientX - rect.left;
}

function handleMove(e) {
    if (isDragging && currentFruit && !isGameOver) {
        // 이동 중 브라우저 기본 동작(스크롤 등) 차단
        if (e.cancelable) e.preventDefault();
        
        let x = getInputX(e);
        const level = parseInt(currentFruit.label.split('_')[1]);
        const radius = FRUITS[level - 1].radius;
        
        // 벽 안쪽 제한 (벽 두께 40px 기준)
        x = Math.max(40 + radius, Math.min(360 - radius, x));
        Body.setPosition(currentFruit, { x: x, y: 80 });
    }
}

function handleStart(e) {
    // UI 버튼 클릭 시나 게임 상태에 따른 예외 처리
    if (e.target.id === 'reset-btn' || isGameOver || !canDrop) return;
    
    // 드래그 상태 시작
    isDragging = true;
    handleMove(e); 
}

function handleEnd(e) {
    // 드래그 중인 상태에서 손을 뗄 때만 딱 한 번 실행
    if (isDragging && currentFruit) {
        isDragging = false;
        canDrop = false; // 새로운 과일 생성 전까지 추가 입력 방지
        
        // 정적 상태 해제하여 물리 엔진(중력) 적용
        Body.setStatic(currentFruit, false);
        
        // 효과음 재생
        playSound('sound-drop');

        currentFruit = null;
        // 1초 뒤 자동 생성
        setTimeout(spawnFruit, 1000); 
    }
}

// 7. 이벤트 리스너 통합 관리 (간섭 원천 차단)

// PC 마우스 (container에서 시작해서 window에서 끝냄)
container.addEventListener('mousedown', handleStart);
window.addEventListener('mousemove', handleMove);
window.addEventListener('mouseup', handleEnd);

// 모바일 터치 (가장 중요한 부분)
container.addEventListener('touchstart', (e) => {
    if (e.target.id === 'reset-btn') return;
    
    // 이 한 줄이 터치 후 발생하는 mousedown/click 이벤트를 막아줍니다.
    if (e.cancelable) e.preventDefault(); 
    
    handleStart(e);
}, { passive: false });

container.addEventListener('touchmove', handleMove, { passive: false });

container.addEventListener('touchend', (e) => {
    // 터치 종료 시 드롭 실행
    handleEnd(e);
}, { passive: false });

// 8. 충돌(합성) 로직
Events.on(engine, 'collisionStart', (event) => {
    event.pairs.forEach((pair) => {
        const { bodyA, bodyB } = pair;
        if (bodyA.label && bodyB.label && bodyA.label.startsWith('fruit_') && bodyA.label === bodyB.label) {
            if (bodyA.isMerging || bodyB.isMerging) return;
            const level = parseInt(bodyA.label.split('_')[1]);
            if (level < 11) {
                bodyA.isMerging = true; bodyB.isMerging = true;
                const midX = (bodyA.position.x + bodyB.position.x) / 2;
                const midY = (bodyA.position.y + bodyB.position.y) / 2;
                
                playSound('sound-merge');
                Composite.remove(world, [bodyA, bodyB]);
                Composite.add(world, createFruit(midX, midY, level + 1));
                
                score += FRUITS[level - 1].score;
                document.getElementById('score').innerText = score;
            }
        }
    });
});

// 9. 게임오버 체크
Events.on(engine, 'afterUpdate', () => {
    if (isGameOver) return;
    const fruits = Composite.allBodies(world).filter(b => b.label && b.label.startsWith('fruit_') && !b.isStatic);
    for (let fruit of fruits) {
        if (fruit.position.y < topSensorY && Math.abs(fruit.velocity.y) < 0.2) {
            isGameOver = true;
            playSound('sound-gameover');
            document.getElementById('game-over').style.display = 'block';
            document.getElementById('final-score').innerText = score;
        }
    }
});

// 실행
Render.run(render);
Runner.run(Runner.create(), engine);
spawnFruit();

window.resetGame = function() {
    location.reload();
}
