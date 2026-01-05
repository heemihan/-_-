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
        background: 'transparent' // CSS의 배경 이미지가 보이도록 설정
    }
});

// 배경 이미지 직접 적용 (index.html CSS에 넣어도 됨)
document.getElementById('game-container').style.backgroundImage = "url('asset/background.png')";
document.getElementById('game-container').style.backgroundSize = "cover";

// 벽 생성 로직은 기존과 동일... (생략)
const wallThickness = 60;
const ground = Bodies.rectangle(200, 630, 400, wallThickness, { isStatic: true, render: { visible: false } });
const leftWall = Bodies.rectangle(-25, 300, 50, 600, { isStatic: true, render: { visible: false } });
const rightWall = Bodies.rectangle(425, 300, 50, 600, { isStatic: true, render: { visible: false } });
Composite.add(world, [ground, leftWall, rightWall]);

let score = 0;
let isGameOver = false;

// 게임 초기화(리셋) 함수
window.resetGame = function() {
    // 1. 모든 과일 제거
    const fruits = Composite.allBodies(world).filter(b => b.label && b.label.startsWith('fruit_'));
    Composite.remove(world, fruits);

    // 2. 변수 초기화
    score = 0;
    isGameOver = false;
    document.getElementById('score').innerText = '0';
    document.getElementById('game-over').style.display = 'none';

    // 3. 엔진 다시 시작
    Engine.clear(engine);
    spawnFruit();
}

// ... spawnFruit 및 기타 로직 ...

Render.run(render);
Runner.run(Runner.create(), engine);
spawnFruit();
