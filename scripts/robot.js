class Robot{
  constructor(id, position, goal, radius, envWidth, envHeight, scene, motionPlanningAlgorithm){
    // configs
    this.MovementGoals = {  Goal: 1,
                            InBVC: 3 };
    this.DeadLockRecovery = { None:0,
                              Simple: 1,
                              Advanced: 2 };

    this.id = id;
    this.position = position;
    this.prevPosition = position;
    this.goal = goal;
    this.tempGoal = null;
    this.radius = radius;
    this.envWidth = envWidth;
    this.envHeight = envHeight;
    this.scene = scene;
    this.VC = [];

    // Initialize velocity according to movement goal
    this.velocity = {x: 0, y: 0};
    this.setMovementGoal(motionPlanningAlgorithm);

    // Initialize deadlock detection mechanisms
    this.deadLockDetectionEnabled = true;
    this.deadLockDetectionDuration = 5;
    this.stuckAtTempGoalDuration = 0;
    
    // Initialize deadlock recovery mechanisms
    this.deadLockRecoveryAlgorithm = this.DeadLockRecovery.None;
    this.deadLockManeuverInProgress = false;

    this.remainingDeadlockManeuvers = 0;
    this.maxConsecutiveDeadlockManeuvers = 3;
    this.maneuverDirection = 0;

    // Deadlock parameters
    let robotArea = circleArea(this.radius);
    this.bvcAreaThreshold = robotArea * 3;
  }

  setMovementGoal(movementGoal){
    this.movementGoal = movementGoal;

    switch (this.movementGoal ) {
      case this.MovementGoals.Goal:
        this.tempGoal = this.goal;
        this.updateVelocity();
        break;
      case this.MovementGoals.InBVC:
        this.setTempGoalInCell(this.BVC);
        this.updateVelocity();
        break;
      default:
        this.tempGoal = this.goal;
        this.updateVelocity();
        break;
    }
  }

  timeStep(timeDelta){
    this.updateVelocity();
    this.limitGoal();
    this.prevPosition = this.position;
    this.position = this.limitPos({   x: this.position.x + this.velocity.x * timeDelta,
                                      y: this.position.y + this.velocity.y * timeDelta});
  }

  updateVelocity(){
    switch (this.movementGoal) {
      case this.MovementGoals.Goal:
        this.tempGoal = this.goal;
        this.setVelocityTo(this.goal);
        break;
      case this.MovementGoals.InBVC:
        this.setTempGoalInCell(this.BVC);
        this.setVelocityTo(this.tempGoal);
        break;
      default:
        this.tempGoal = this.goal;
        break;
    }
  }

  setVelocityTo(point, velocityScale = 10){
    if(this.reached(point)){
      this.velocity = {x:0, y:0};
    } else{
      const xDiff = point.x - this.position.x;
      const yDiff = point.y - this.position.y;

      if(this.deadLockManeuverInProgress){
        this.velocity.x = xDiff;
        this.velocity.y = xDiff;
      }
      
      this.velocity.x = xDiff/velocityScale;
      this.velocity.y = yDiff/velocityScale;
    }
  }

  setTempGoalInCell(cell){
    // If cell is undefined (shouldn't happen in collision-free configurations) => set localgoal = goal
    if(cell == null || cell.length<2){
      this.tempGoal = this.goal;
      return;
    }

    // If the goal is within the Voronoi cell => set localgoal = goal
    if(this.VcContains(this.goal)){
      this.tempGoal = this.goal;
      return;
    }

    // If deadlocked or deadlock is expected or currently recovering from deadlock
    // set local goal according to deadlock recovery policies
    if (this.setLocalGoalByDeadlockRecovery(cell)){
      return;
    }

    // Default behavior: set local goal as the point in cell that is closest to the goal
    this.tempGoal = this.findPointInCellClosestToGoal(cell);
  }

  setLocalGoalByDeadlockRecovery(cell){
    // tests whether local goal should be set according to deadlock recovery policies
    // if so => sets local goal accordingly and returns true, else returns false
    
    // If currently recovering from deadlock
    if(this.recoveringFromDeadLock()){      
      // if current maneuver's tempGoal is still valid (the current tempGoal has not been reached) => do not change it, return true
      if(this.deadLockTempGoalStillValid()){
        return true;
      }
      // if not, then current maneuver's tempGoal has been reached => end current maneuver
      this.remainingDeadlockManeuvers -= 1;
      this.deadLockManeuverInProgress = false;
      
      // if another maneuver is needed => initiate it, localGoal is set there so return true
      if(this.shouldPerformAnotherManeuver()){
        this.initiateDeadlockManeuver();
        return true;
      } else{
        this.remainingDeadlockManeuvers = 0;
      }
    } 
    // if not recovering from deadlock, test wether currently deadlocked
    else if(this.deadLockRecoveryAlgorithm != this.DeadLockRecovery.None && this.deadLocked()){
      // if deadlocked => start deadlock recovery, localGoal is set there so return true
      this.startDeadlockRecovery(cell);
      return true;
    }

    // If all condition fails => localGoal should not be set according to deadlock recovery policies
    return false;
  }

  findPointInCellClosestToGoal(cell){
    var tempG = null;
    var minDist = null;

    for (let index = 0; index < cell.length; index++) {
      const v1 = cell[index];
      const v2 = cell[nxtCircIndx(index,cell.length)];
      let closestPointInLineSeg = closestPointInLineSegToPoint(this.goal.x, this.goal.y, v1[0], v1[1], v2[0], v2[1]);

      let distGoalToLineSeg = distanceBetween2Points(this.goal, closestPointInLineSeg);
      
      if(tempG==null || distGoalToLineSeg < minDist){
        tempG = {x:closestPointInLineSeg.x, y:closestPointInLineSeg.y};
        minDist = distGoalToLineSeg;
      }
    }

    return tempG;
  }

  recoveringFromDeadLock(){
    return this.deadLockManeuverInProgress || this.remainingDeadlockManeuvers>0;
  }

  deadLocked(){
    if(this.reached(this.tempGoal) && !this.reached(this.goal)){
      this.stuckAtTempGoalDuration += 1;
    } else{
      this.stuckAtTempGoalDuration = 0;
    }

    return this.deadLockDetectionEnabled && this.stuckAtTempGoalDuration > this.deadLockDetectionDuration;
  }

  deadLockExpected(){
    // TODO
    return false;
  }

  startDeadlockRecovery(cell){
    this.remainingDeadlockManeuvers = this.maxConsecutiveDeadlockManeuvers;
    this.maneuverDirection = this.getManeuverDirAccToDLRecoveryAlgo(cell);
    this.initiateDeadlockManeuver(cell);
  }

  getManeuverDirAccToDLRecoveryAlgo(cell){
    if(this.deadLockRecoveryAlgorithm == this.DeadLockRecovery.Simple){
      return 1;
    } else if(this.deadLockRecoveryAlgorithm == this.DeadLockRecovery.Advanced){
      let furthestPoint = this.getFurthestVertexFromLineSeg(cell, this.position, this.goal);
      let furthestPointDir = pointIsOnRightSideOfVector(furthestPoint.x, furthestPoint.y, 
                                                        this.position.x, this.position.y, 
                                                        this.goal.x, this.goal.y);
      return furthestPointDir;
    }
  }

  initiateDeadlockManeuver(cell){
    if(this.deadLockRecoveryAlgorithm == this.DeadLockRecovery.Simple){
      this.setTempGoalAccToSimpleDeadlockRec(cell);
    } 
    else if (this.deadLockRecoveryAlgorithm == this.DeadLockRecovery.Advanced){
      this.setTempGoalAccToAdvancedDeadlockRec(cell);
    }
    
    this.deadLockManeuverInProgress = true;
  }

  // returns temp goal according to simple deadlock recovery algorithm
  setTempGoalAccToSimpleDeadlockRec(cell){
    for (let index = cell.length-1; index>=1; index--) {
      let point = xyPoint(cell[index]);
      if(point.x == this.tempGoal.x && point.y == this.tempGoal.y){
        this.tempGoal = xyPoint(cell[index-1]);
        return;
      }
    }
  }
  
  // returns temp goal according to advanced deadlock recovery algorithm
  // vertices are the vertices of cell that lie on the current maneuver direction
  setTempGoalAccToAdvancedDeadlockRec(cell){
    let vertecies = this.getVerteciesOnManeuverDir(cell, this.position, this.goal)

    let bvcArea = polygonArea(this.BVC);
    let firstDeadlockManeuver = this.remainingDeadlockManeuvers == this.maxConsecutiveDeadlockManeuvers;
    let curBvcAreaIsTooSmall = bvcArea < this.bvcAreaThreshold;
    
    if( firstDeadlockManeuver || curBvcAreaIsTooSmall){
      this.tempGoal = this.getFurthestVertexFromLineSeg(vertecies, this.position, this.goal);
    } else{
      if(Math.random()<0.1){
        this.tempGoal = this.getRandomVertex(vertecies);
      } else{
        this.tempGoal = this.getClosestWideMidPointToGoal(this.BVC, this.position, this.goal);
      }
    }
  }

  shouldPerformAnotherManeuver(){
    return  this.deadLockRecoveryAlgorithm == this.DeadLockRecovery.Advanced &&
            this.remainingDeadlockManeuvers > 0;
  }

  deadLockTempGoalStillValid(){
    return !this.reached(this.tempGoal) && this.scene.voronoi.contains(this.id, this.tempGoal.x, this.tempGoal.y);
  }

  getVerteciesOnManeuverDir(cell, linesSegP1, lineSegP2){
    let vertecies = [];

    cell.forEach(vertex => {
      let dir = pointIsOnRightSideOfVector(vertex[0], vertex[1], linesSegP1.x, linesSegP1.y, lineSegP2.x, lineSegP2.y);
      if( dir == this.maneuverDirection){
        vertecies.push(vertex);
      }  
    });
    return vertecies;
  }

  getRandomVertex(cell){
    try {
      let vertex = cell[Math.floor(Math.random()*cell.length)];
      return {x:vertex[0], y:vertex[1]};
      
    } catch (error) {
      if(cell !== undefined){
        return {x:cell[0][0], y:cell[0][1]};
      } else{
        return this.position;
      }
    }
  }

  getClosestWideMidPointToGoal(cell, position, goal){
    let bestVertex = cell[0];
    let minDist = null;

    for (let index = 0; index < cell.length; index++) {
      const p1 = cell[index];
      const p2 = cell[nxtCircIndx(index,cell.length)];
      const lineSegLength = distanceBetween2Points({x:p1[0], y:p1[1]}, {x:p2[0], y:p2[1]});
      const midPoint = midPointOfLineSeg(p1[0], p1[1], p2[0], p2[1]);
      const distToGoal = distanceBetween2Points(midPoint, goal);

      if(lineSegLength < this.radius * 2 || (minDist !== null && distToGoal > minDist)){
        continue;
      } else {
        bestVertex = midPoint;
        minDist = distToGoal; 
      }
    }

    if(minDist == null){
      console.log("None found!");
      bestVertex = {x:bestVertex[0], y:bestVertex[1]};
    }

    return bestVertex;
  }

  getFurthestVertexFromLineSeg(cell, linesSegP1, lineSegP2){
    let bestVertex = cell[0];
    let maxDist = null;

    cell.forEach(vertex => {
      let dist = distanceBetweenPointAndLine({x:vertex[0], y:vertex[1]}, linesSegP1, lineSegP2);
      if( maxDist == null || dist > maxDist){
        bestVertex = vertex;
        maxDist = dist; 
      }  
    });
    return {x:bestVertex[0], y:bestVertex[1]};
  }

  VcContains(point){
    return typeof(this.scene.voronoi) !== "undefined" && this.scene.voronoi != null && 
        this.scene.voronoi.contains(this.id, point.x, point.y);
  }

  reached(point){
    var ret = this.getDistanceTo(point) <= this.radius/10;
    return ret;
  }

  getDistanceTo(point){
    var ret =  distanceBetween2Points(this.position, point);
    return ret;
  }

  limitPos(position){
    const radius = this.radius;
    this.velocity.x = position.x <= radius || position.x >= this.envWidth-radius ? this.velocity.x * -1 : this.velocity.x; 
    this.velocity.y = position.y <= radius || position.y >= this.envHeight-radius ? this.velocity.y * -1 : this.velocity.y;

    return {  x: Math.min( Math.max(radius, position.x), this.envWidth-radius),
              y: Math.min( Math.max(radius, position.y), this.envHeight-radius)};
  }

  limitGoal(){
    const radius = this.radius;
    this.goal = {   x: Math.min( Math.max(radius, this.goal.x), this.envWidth-radius),
                    y: Math.min( Math.max(radius, this.goal.y), this.envHeight-radius)};  
  }

  collidingWithRobot(r){
    return distanceBetween2Points(this.position,r.position) < this.radius*2;
  }

  getCollisionsAgainstRobots(robots, prevent=false){
    let collisions = [];
    robots.forEach(r => {
      if(this.collidingWithRobot(r)){
        collisions.push([Math.min(this.id, r.id), Math.max(this.id, r.id)]);
      }
    });
    return collisions;
  }
  
  setDeadlockAlgo(DeadlockAlgo){
    switch (DeadlockAlgo) {
      case 0:
        this.deadLockRecoveryAlgorithm = this.DeadLockRecovery.None;   
        break;
      case 1:
        this.deadLockRecoveryAlgorithm = this.DeadLockRecovery.Simple;   
        break;
      case 2:
        this.deadLockRecoveryAlgorithm = this.DeadLockRecovery.Advanced;  
        break;
      default:
        break;
    }
  }
}
