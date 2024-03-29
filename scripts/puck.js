/* eslint-disable no-console */
/* eslint-disable class-methods-use-this */
/* eslint-disable no-undef */
// eslint-disable-next-line no-unused-vars
class Puck {
  constructor(id, position, goal, radius, envWidth, envHeight, scene, color, map) {
    this.id = id;
    this.position = position;
    this.prevPosition = position;
    this.velocityScale = 1;
    this.groupGoal = { ...goal };
    this.goal = goal;
    this.radius = radius;
    this.color = color;
    this.envWidth = envWidth;
    this.envHeight = envHeight;
    this.scene = scene;
    this.engine = this.scene.engine;
    this.world = this.scene.world;
    this.map = map;

    // Create Matter.js body and attach it to world
    this.body = Bodies.circle(position.x, position.y, this.radius);
    // this.body.friction = 0;
    this.body.frictionAir = 1;
    // this.body.frictionStatic = 0;
    // this.body.restitution = 0;
    // this.body.collisionFilter = {
    //   group: -1,
    //   category: 1,
    //   mask: 1,
    // };
    World.add(this.world, this.body);

    // Initialize velocity according to movement goal
    this.velocity = { x: 0, y: 0 };

    // Distances Configurations
    // this.blockedDistance = this.radius * 1.5;
    this.goalReachedDist = this.radius * 12;
    this.deepInGoalDist = this.radius * 8;
  }

  timeStep() {
    this.prevPosition = this.position;
    this.position = this.body.position;
    this.updateGoal();
    this.limitGoal();
  }

  updateGoal() {
    if (this.reachedGoal()) {
      this.goal = this.groupGoal;
    } else {
      const mapY = Math.min(this.map.length, Math.max(0, Math.floor(this.position.y / 4)));
      const mapX = Math.min(this.map[0].length, Math.max(0, Math.floor(this.position.x / 4)));
      const dir = this.map != null && this.map[mapY] != null && this.map[mapY][mapX] != null
        ? this.map[mapY][mapX]
        : [1, 1];
      this.goal = {
        x: this.position.x + dir[0] * this.radius * 10,
        y: this.position.y + dir[1] * this.radius * 10,
      };
    }
  }

  isBlocked() {
    return false;

    // let blocked = false;

    // const closestPointToEnvBounds = closestPointInPolygonToPoint(
    //   this.scene.environmentBounds,
    //   this.position,
    // );
    // const distToEnvBounds = this.getDistanceTo(closestPointToEnvBounds);
    // if (distToEnvBounds < this.blockedDistance * 2) {
    //   blocked = true;
    // }

    // for (let index = 0; !blocked && index < this.scene.staticObjects.length; index += 1) {
    //   const staticObj = this.scene.staticObjects[index];
    //   if (staticObj.getDistanceToBorder(this.position) < this.blockedDistance) {
    //     blocked = true;
    //   }
    // }

    // return blocked;
  }

  reachedGoal() {
    return this.reachedDist(this.groupGoal, this.goalReachedDist);
  }

  deepInGoal() {
    return this.reachedDist(this.goal, this.deepInGoalDist);
  }

  reached(point) {
    const ret = this.getDistanceTo(point) <= this.radius * 10;
    return ret;
  }

  reachedDist(point, distance) {
    const ret = this.getDistanceTo(point) <= distance;
    return ret;
  }

  getDistanceTo(point) {
    const ret = distanceBetween2Points(this.position, point);
    return ret;
  }

  limitGoal() {
    const { radius } = this;
    this.goal = {
      x: Math.min(Math.max(radius, this.goal.x), this.envWidth - radius),
      y: Math.min(Math.max(radius, this.goal.y), this.envHeight - radius),
    };
  }

  generateStaticObjectDefinition() {
    return {
      type: 'circle',
      center: this.position,
      radius: this.radius,
    };
  }
}
