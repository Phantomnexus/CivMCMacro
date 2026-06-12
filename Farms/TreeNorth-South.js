/*Script to harvest a tree farm in which rows are arrangged north-south, and replant.
 * lodestone should be at north-east corner
 
V1.7 by arthirob, 14/10/2024 modified by Sublime 12/7/2026
replant saplings is disabled but can easily be renabled by calling it in start function*/

// Variable and constant declaration
const p = Player.getPlayer() ;
const im = Player.getInteractionManager();
var inv = Player.openInventory();

//Farm borders and properties
const lodestoneX = -8082;
const lodestoneZ = -1682;
const xEast = -8082 ; //Eastern edge (most easterly X)
const xWest = -8184 ; // Western edge
const zNorth = -1682; // North limit
const zSouth = -1616; // South limit
const lastLevel = 203; //First level of the farm
const farmNumberLevel = 15; //Number of farm level
const rowSpace = 6; //Space between rows (Along Z axis)
const treeSpace = 6; //Space between trees in a row (Along X axis)
const firstTreeDist = 6;//The distance between the first tree and the edge of the farm
const levelSpace = 6; //Space between two levels
const woodType = "jungle"
const lagTick = 5; //Lag safeguard.
const runningPause = 10;// The amount of time you stop when bumping leaves
const dumpSpot = -8085; // X coordinate of the water channel this should b a tree spot
const shearsNeeded = 0; 
const saplingStack = Math.floor(((xEast-xWest)/treeSpace)*((zSouth-zNorth)/rowSpace)/64)+2; 
const damageTreshhold=20; 
const shearDamageTreshold= 10;
const toDump = [`minecraft:${woodType}_log`,`minecraft:stripped_${woodType}_log`,`minecraft:${woodType}_leaves`,`minecraft:stick`];
const fastMode = true; 
const foodType = "minecraft:cooked_porkchop"; // Change the food to be whatever you prefer to use !
const toolType = "minecraft:air"
const discordGroup = 'GHFarming'; 
const farmName = " Saoirse Jungle Tree Farm"
const regrowTime = 12;

var breakTime;
var currentRow; 
var currentX; 
var currentZ; 
var currentY; 
var nextLog;
var dir; // 0 for East (increasing X), 1 for West (decreasing X)
var prevX ;
var stuck ; 
var toolList ; 
var lowestToolDamage ; 
var currentToolDamage ; 
var underLog ; 
var boolFarmFinished = false;
var previousSlot ;
var previousItem ;
var startLevel;

const startTime = Date.now();
var plantedSapling = 0;

function equip(item,slot) { 
    list = inv.findItem(item);
    if (list.length==0) {
        throw("No more "+item);
    }
    inv.swapHotbar(list[0],slot);
    Client.waitTick();
}

function eat() {
    if (p.getFoodLevel()<16) {
        if (inv.getSlot(38).getItemId()!=foodType) {
            equip(foodType,2);
        }
        inv.setSelectedHotbarSlotIndex(2);
        KeyBind.keyBind("key.use", true);
        do {
            Client.waitTick(lagTick);
        } while (p.getFoodLevel()<16)
        inv.setSelectedHotbarSlotIndex(0);
        KeyBind.keyBind("key.use", false);
    }
}

function placeFill(slot) {
    previousItem = inv.getSlot(36+slot).getItemId();
    previousSlot = inv.getSelectedHotbarSlotIndex();
    inv.setSelectedHotbarSlotIndex(slot);
    Client.waitTick();
    im.interact();
    Client.waitTick();
    if (inv.getSlot(36+slot).getItemId()!=previousItem) {
        list = inv.findItem(previousItem);
        if (list.length==0) {
            Chat.log("Out of mats")
            throw("No more mats")
        }
        inv.swapHotbar(list[0],1);
        Client.waitTick();
    }
    inv.setSelectedHotbarSlotIndex(previousSlot);
}

function lookAtCenter(x, z) {
    p.lookAt(x+0.5,p.getY()+1.5, z+0.5);
}

function walkTo(x, z) { 
    lookAtCenter(x,z);
    KeyBind.keyBind("key.forward", true);
    while ((Math.abs(p.getX() - x - 0.5) > 0.2 || Math.abs(p.getZ() - z - 0.5 ) > 0.2)){
        lookAtCenter(x,z);
        Time.sleep(10);
    }
    KeyBind.keyBind("key.forward", false);
    Client.waitTick(3);
}

function disableCtb() {
    Chat.say("/ctb");
    Client.waitTick(lagTick);
    if (Chat.getHistory().getRecvLine(0).getText().getString() == "Bypass mode has been enabled. You will be able to break reinforced blocks if you are on the group.") { 
        Chat.say("/ctb");
    }
}

function toolCheck() { 
    if ((inv.getSlot(36).getMaxDamage()-inv.getSlot(36).getDamage())<damageTreshhold) {
        toolSwitch();
    }
}

function toolSwitch(){ 
    toolList = inv.findItem("minecraft:diamond_axe")  
    var usableSlot = 0;
    lowestToolDamage = 10000 ;
    for (i=0;i<toolList.length;i++) { 
        currentToolDamage = inv.getSlot(toolList[i]).getMaxDamage()-inv.getSlot(toolList[i]).getDamage() 
        if (currentToolDamage>=damageTreshhold) { 
            if (currentToolDamage<lowestToolDamage) {
                usableSlot = toolList[i];
                lowestToolDamage = currentToolDamage;
            }
        } 
    }
    if (usableSlot==0) {
        Chat.log("You are out of tools")
        throw("No more tools to use")
    }
    inv.swapHotbar(usableSlot,0);
    var effBonus = 0; 
    const axe = inv.getSlot(36);
    const enchantHelper = axe.getEnchantment("Efficiency");
    if (enchantHelper != null) {
        effBonus = (enchantHelper.getLevel())**2+1;
    }
    var damage = (8+effBonus)/60 
    breakTime = Math.ceil(1/damage)+lagTick;
}

function dumpWood(){ 
    p.lookAt(-160,40)
    KeyBind.keyBind("key.attack", true);
    Client.waitTick(30);
    KeyBind.keyBind("key.attack", false);
    Chat.log("I am gonna dump the wood");
    for (let i = 9; i < 45 ; i++)    {
        if (toDump.includes(inv.getSlot(i).getItemID())) {
            inv.dropSlot(i,true)
        }
    }
    Client.waitTick();
}

function reachLog(x) { 
    lookAtCenter(x, currentRow);
    KeyBind.keyBind("key.attack", true);
    KeyBind.keyBind("key.forward", true);
    if (fastMode==true) {
        inv.setSelectedHotbarSlotIndex(3);
        KeyBind.keyBind("key.sprint", true);
    } else {
        inv.setSelectedHotbarSlotIndex(2); 
    }   
    while (Math.abs(p.getX()-x-dir)>0.350){
        prevX = p.getX();
        Client.waitTick();
        if (Math.abs((p.getX()-prevX))<0.1) { 
            KeyBind.keyBind("key.forward", false);
            Client.waitTick(runningPause);
            KeyBind.keyBind("key.forward", true);
            Client.waitTick(lagTick);
        }
    }
    KeyBind.keyBind("key.sprint", false);
    Client.waitTick();
    KeyBind.keyBind("key.forward", false);
    KeyBind.keyBind("key.attack", false);
    if (Math.abs(p.getX()-x-dir)>0.3){
        return true
    } else {
        return false
    }
}

function shearsSwitch() {
    const shearList = inv.findItem(toolType);
    if (shearList.length==0) {
        Chat.log("You are out of leaf tool");
        throw("Out of leaf tool")
    }
    inv.swapHotbar(shearList[0],3);
}
 
function sortLeaves() { 
    originalDamage = inv.getSlot(39).getDamage()
    leafTry = 0;
    while ((originalDamage==inv.getSlot(39).getDamage())&&(leafTry<2)){
        inv.setSelectedHotbarSlotIndex(3);
        Client.waitTick(2);
        im.attack();
        Client.waitTick(2);
        if (originalDamage==inv.getSlot(39).getDamage()) {
            inv.setSelectedHotbarSlotIndex(0);
            KeyBind.keyBind("key.attack",true);
            Client.waitTick(breakTime);
            KeyBind.keyBind("key.attack",false);
            Client.waitTick();
            leafTry++;
        }
        if (inv.getSlot(39).getItemID()!=toolType) { 
            shearsSwitch();
        }
    }
}

function notUnderLog(coord, axisZ) {
    if (axisZ) {
        return (Math.floor(p.getZ())!=coord)
    } else {
        return (Math.floor(p.getX())!=coord)
    }
}

function harvestLog(coord, axisZ){ 
    if (axisZ) {
        p.lookAt(dir*180+6,35) 
    } else {
        p.lookAt(dir*180-90+6,35) 
    }   
    inv.setSelectedHotbarSlotIndex(0);
    KeyBind.keyBind("key.attack", true);
    Client.waitTick(breakTime*2+lagTick); 
    KeyBind.keyBind("key.attack", false);
    KeyBind.keyBind("key.forward", true);
    if (axisZ) {
        p.lookAt(dir*180,35) 
    } else {
        p.lookAt(dir*180-90,35) 
    }
    stuck = 0;
    while (notUnderLog(coord, axisZ)){ 
        Client.waitTick();
        stuck+=1;
        if (stuck > 30) { 
            stuck = 0;
            KeyBind.keyBind("key.attack", true);
            Client.waitTick(breakTime); 
            KeyBind.keyBind("key.attack", false);
        }
    }
    KeyBind.keyBind("key.forward", false);
    p.lookAt(dir*180-90,-90);
    KeyBind.keyBind("key.attack",true);
    Client.waitTick(breakTime*3+lagTick);
    KeyBind.keyBind("key.attack",false);
    sortLeaves();
    p.lookAt(dir*180-90,90);
    Client.waitTick(lagTick);
    placeFill(1);
    Client.waitTick(lagTick) 
    plantedSapling+=1;
    if ((inv.getSlot(36).getMaxDamage()-inv.getSlot(36).getDamage())<damageTreshhold) {
        toolCheck();
    }
}

function lineFinished() { 
    if (dir==1) {
        return (nextLog == (xWest+(firstTreeDist-treeSpace)))
    } else {
        return (nextLog == (xEast-(firstTreeDist-treeSpace)))
    }
}

function farmFinished() { 
    if (p.getY()==lastLevel) {
        if ((boolFarmFinished)||(startLevel==lastLevel)) {
            return true
        } else {
            boolFarmFinished = true
            return false
        }
    } else {
        return false
    }
}

function farmLine(){ 
    currentX = Math.floor(p.getX());
    if ((currentX==xWest)||(currentX==xEast)) { 
        nextLog = currentX+firstTreeDist*(1-2*dir);
    } else {
        nextLog = currentX+treeSpace*(1-2*dir);
    }
    while (!lineFinished()) {
        treeBool = reachLog(nextLog); 
        if (treeBool) { 
            Client.waitTick(lagTick); 
            harvestLog(nextLog,false);
        } else { 
            p.lookAt(nextLog+0.5,p.getY(),currentRow+0.5);
            placeFill(1);
        }
        
        if (nextlog == dumpSpot) { 
            dumpWood();
        }
        nextLog = nextLog + treeSpace*(1-2*dir);
     }
    nextLog+=(firstTreeDist-treeSpace)*(1-2*dir);
    reachLog(nextLog); 
    eat();
}

function farmMain(currentX, currentZ) {
    while (!farmFinished()) {
        currentY = Math.floor(p.getY());
        Chat.log("Starting level at Y: " + currentY);
        
        farmLevel(currentX, currentZ);
        
        // Perimeter pathing around boundaries to hit the lift
        walkTo(xEast, p.getZ()); 
        Client.waitTick(10);
        walkTo(lodestoneX, lodestoneZ); 
        Client.waitTick(10);

        if (currentY < lastLevel) {
            let targetY = currentY + levelSpace;
            Chat.log("Climbing floor... Target Y: " + targetY);
            
            KeyBind.keyBind("key.jump", true);
            while (p.getY() < targetY - 0.5) { 
                Client.waitTick(1); 
            }
            KeyBind.keyBind("key.jump", false);
            Client.waitTick(20); 
        }

        walkTo(xEast, zNorth); 
        dir = 1; 
        currentX = Math.floor(p.getX());
        currentZ = Math.floor(p.getZ());
    }
}

function farmLevel(currentX,currentZ) { 
    currentRow = currentZ; 
    while (currentRow <= zSouth) {
        farmLine();
        currentRow+=rowSpace;
        if (currentRow <= zSouth) {
            walkTo(xEast*(1-dir) + xWest*dir, currentRow);
        }
        dir=(dir+1)%2
    }
    walkTo(xEast,zSouth);
    Chat.log("Level finished !")
}

function finishFarm(){
    const farmTime = Math.floor((Date.now()-startTime)/1000);
    Chat.say("/g "+discordGroup+" "+farmName+" is finished to harvest in "+(Math.floor(farmTime/60))+" minutes and "+(farmTime%60)+" seconds. It'll be ready again in "+regrowTime+" hours. Now logging out")  
    Chat.say("/logout")   
}

function start() { 
    currentX = Math.floor(p.getX());
    currentZ = Math.floor(p.getZ());
    startLevel = p.getY();

    if ((xWest<=currentX)&&(currentX<=xEast)&&(zNorth<=currentZ)&&(currentZ<=zSouth)) { 
        if (currentX == xWest) { 
            p.lookAt(-90,0); // Face East
        }
        if (currentX == xEast) {
            p.lookAt(90,0); // Face West
        }
        Client.waitTick(5);
        
        if (((currentZ-zNorth)%rowSpace)==0) { 
            if ((((currentX-xWest)%treeSpace)==(firstTreeDist%treeSpace))||(currentX==xWest)||(currentX==xEast)) { 
                // FIXED YAW MATH FOR EAST/WEST
                dir = (Math.floor((p.getYaw()+540)/180))%2; 
                
                equip(`minecraft:${woodType}_sapling`,1);
                toolSwitch();
                shearsSwitch();
                disableCtb();
                equip(foodType,2);
                farmMain(currentX,currentZ);
                finishFarm();
            } else {
                Chat.log("Start in a tree spot or at the end of the line")
            }
        } else {
            Chat.log("Please, start in a row");
        }
     }else {
        Chat.log("You are not in the farm, cannot proceed");
    }
}

start();

