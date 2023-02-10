const tileSize = 32;
const rows = 16;
const columns = 16;

let board;
const boardWidth = tileSize * columns; //se multiplica por el tamaño de cada tile para obtener el tamaño del canvas en pixeles-> 512
const boardHeight = tileSize * rows; //se multiplica por el tamaño de cada tile para obtener el tamaño del canvas en pixeles-> 512 
let context;

//ship
const shipWidth = tileSize*2; //el ancho de la nave es el doble del tamaño de cada tile, y de altura el mismo tamaño que cada tile
const shipHeight = tileSize; 
const shipX = tileSize * columns/2 - tileSize; //la nave se coloca en el centro del canvas (eje X)
const shipY = tileSize * rows - tileSize*2; //la nave se coloca en la parte inferior del canvas (eje Y)

const ship = {
    x : shipX,
    y : shipY,
    width : shipWidth,
    height : shipHeight
}

let shipImg;
const shipVelocityX = tileSize; //la nave se mueve 32 pixeles a la derecha o izquierda

//aliens
let alienArray = [];
const alienWidth = tileSize*2;
const alienHeight = tileSize;
const alienX = tileSize;
const alienY = tileSize;
let alienImg;

let alienRows = 2;
let alienColumns = 3;
let alienCount = 0; 
let alienVelocityX = 1;  //la velocidad de los aliens es 1 pixel

//bullets
let bulletArray = [];
const bulletVelocityY = -10; //velocidad a la que dispara la nave

//alien bullets
const alienBulletArray = [];  
const alienBulletVelocityY = 5; //velocidad a la que dispara los aliens

//game
let score = 0;
let gameOver = false;

window.onload = function() {
    board = document.getElementById("board");
    board.width = boardWidth;
    board.height = boardHeight;
    context = board.getContext("2d"); //para dibujar en el canvas

    //load images
    shipImg = new Image();
    shipImg.src = "img/ship.png";
    shipImg.onload = function() { //cuando la imagen se haya cargado, se dibuja la nave
        context.drawImage(shipImg, ship.x, ship.y, ship.width, ship.height);
    }

    alienImg = new Image();
    alienImg.src = "img/alien.png";
    createAliens();

    requestAnimationFrame(update); //para que se actualice el canvas continuamente 
    document.addEventListener("keydown", moveShip); //cuando se pulsa una tecla, se ejecuta la función moveShip
    document.addEventListener("keyup", shoot);  //cuando se suelta una tecla, se ejecuta la función shoot
    setInterval(alienShoot, 1000); //cada segundo, se ejecuta la función alienShoot

}

function update() {
    requestAnimationFrame(update); 

    if (gameOver) {
        context.fillStyle="white";
        context.font="40px Courier New";
        context.fillText("Game Over!", board.width/2-100, board.height/2);
        return;
    }

    context.clearRect(0, 0, board.width, board.height); //para que se borre el canvas y se vuelva a dibujar todo cada vez que se actualiza el canvas

    //ship
    context.drawImage(shipImg, ship.x, ship.y, ship.width, ship.height);

    //alien
    for (let i = 0; i < alienArray.length; i++) {
        const alien = alienArray[i];
        if (alien.alive) {
            alien.x += alienVelocityX; //se mueve a la derecha o izquierda 

            //if alien touches the borders
            if (alien.x + alien.width >= board.width || alien.x <= 0) { 
                alienVelocityX *= -1; //se cambia la dirección de los aliens
                alien.x += alienVelocityX*2; //se mueven dos pixeles en la dirección contraria para que no se queden pegados a los bordes

                //move all aliens up by one row
                for (let j = 0; j < alienArray.length; j++) {
                    alienArray[j].y += alienHeight;
                }
            }
            context.drawImage(alienImg, alien.x, alien.y, alien.width, alien.height);

            if (alien.y >= ship.y) { //si los aliens llegan hasta la nave, el juego termina
                gameOver = true;
            }
        }
    }

    //bullets
    for (let i = 0; i < bulletArray.length; i++) {
        const bullet = bulletArray[i];
        bullet.y += bulletVelocityY; 
        context.fillStyle="green";
        context.fillRect(bullet.x, bullet.y, bullet.width, bullet.height);

        //bullet collision with aliens
        for (let j = 0; j < alienArray.length; j++) {
            const alien = alienArray[j];
            if (!bullet.used && alien.alive && detectCollision(bullet, alien)) { 
                bullet.used = true;
                alien.alive = false;
                alienCount--; //cuando un alien es destruido, se resta uno al contador de aliens
                score += 100;
            }
        }
    }
    //clear bullets
    while (bulletArray.length > 0 && (bulletArray[0].used || bulletArray[0].y < 0)) {
        bulletArray.shift(); // quita el primer elemento del array
    }

    //alien bullets
    for (let i = 0; i < alienBulletArray.length; i++) {
        const alienBullet = alienBulletArray[i];
        alienBullet.y += alienBulletVelocityY; 
        context.fillStyle="red"
        context.fillRect(alienBullet.x, alienBullet.y, alienBullet.width, alienBullet.height);
        if(detectCollision(alienBullet, ship)) {
            gameOver = true;
        }
    }
    //clear alien bullets
    while (alienBulletArray.length > 0 && (alienBulletArray[0].y > board.height)) {
        alienBulletArray.shift(); //quita el primer elemento del array
    }


    //next level
    if (alienCount == 0) {
        //aumenta el num de aliens y la velocidad si pasa de nivel
        score += alienColumns * alienRows * 100;
        alienColumns = Math.min(alienColumns + 1, columns/2 -2); //el número de columnas no puede ser mayor que la mitad de las columnas del canvas -2
        alienRows = Math.min(alienRows + 1, rows-4);  //el número de filas no puede ser mayor que el número de filas del canvas -4
        if (alienVelocityX > 0) {
            alienVelocityX += 0.2; //aumenta la velocidad de los aliens hacia la derecha
        }
        else {
            alienVelocityX -= 0.2; //aumenta la velocidad de los aliens hacia la izquierda
        }
        alienArray = [];
        bulletArray = [];
        createAliens();
    }

    //score
    context.fillStyle="white";
    context.font="16px courier";
    context.fillText("score: "+score, 5, 20);
}

function moveShip(e) {
    if (gameOver) {
        return;
    }
    if (e.code == "ArrowLeft" && ship.x - shipVelocityX >= 0) { //si la nave no se sale del canvas
        ship.x -= shipVelocityX; 
    }
    else if (e.code == "ArrowRight" && ship.x + shipVelocityX + ship.width <= board.width) { //si la nave no se sale del canvas (sumando el ancho de la nave) 
        ship.x += shipVelocityX; 
    }
}

function createAliens() {
    for (let c = 0; c < alienColumns; c++) {
        for (let r = 0; r < alienRows; r++) {
         const alien = {
                img : alienImg,
                x : alienX + c*alienWidth,
                y : alienY + r*alienHeight,
                width : alienWidth,
                height : alienHeight,
                alive : true
            }
            alienArray.push(alien);
        }
    }
    alienCount = alienArray.length; //el contador de aliens es igual al número de aliens
}

function shoot(e) {
    if (gameOver) {
        return;
    }
    if (e.code == "Space") {
        const bullet = {
            x : ship.x + shipWidth*15/32, //la bala sale del centro de la nave
            y : ship.y,
            width : tileSize/8,
            height : tileSize/2,
            used : false
        }
        bulletArray.push(bullet);
    }
}

function alienShoot() {
    const alien = alienArray[Math.floor(Math.random()*alienArray.length)]; //elige un alien aleatorio
    if (alien.alive) {
        const alienBullet = {
            x : alien.x + alienWidth/2,
            y : alien.y + alienHeight,
            width : tileSize/8,
            height : tileSize/2
        }
        alienBulletArray.push(alienBullet);
    }
}

function detectCollision(a, b) {
 return a.x < b.x + b.width && //la esquina superior izquierda de a es menor que la esquina superior derecha de b
        a.x + a.width > b.x && //la esquina superior derecha de a es mayor que la esquina superior izquierda de b
        a.y < b.y + b.height && //la esquina inferior izquierda de a es menor que la esquina inferior derecha de b
        a.y + a.height > b.y; //la esquina inferior derecha de a es mayor que la esquina inferior izquierda de b
}
