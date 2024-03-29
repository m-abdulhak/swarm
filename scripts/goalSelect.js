/* eslint-disable no-unused-vars */
/* eslint-disable prefer-destructuring */
/* eslint-disable no-undef */
/* eslint no-param-reassign: ["error", { "props": false }] */
// eslint-disable-next-line no-unused-vars
function updateGoal(robot) {
  let lastPosition;
  let durationAtCurPosition = 0;
  let stuck = false;
  let avoidingStuckDuration = 0;
  MIN_STUCK_MANEUVER_DURATION = 30;
  const SAME_POSITION_DISTANCE_THRESHOLD = robot.radius / 50;
  const STUCK_DURATION_THRESHOLD = 30;

  const ANGLE_OPTIMAL_THRESHOLD = 15;
  const ANGLE_ACCEPTABLE_THRESHOLD = 75;

  function getRandPoint() {
    return {
      x: (Math.random() * 0.8 + 0.1) * robot.scene.width,
      y: (Math.random() * 0.8 + 0.1) * robot.scene.height,
    };
  }

  function getGoalFromClosestPointToEnvBounds(closestPoint) {
    const len = robot.getDistanceTo(closestPoint);

    const translationVec = {
      x: ((closestPoint.x - robot.position.x) * robot.radius) / (len * 10),
      y: ((closestPoint.y - robot.position.y) * robot.radius) / (len * 10),
    };

    let midPoint = translatePointInDirection(
      robot.position.x,
      robot.position.y,
      translationVec.x,
      translationVec.y,
    );

    // midPoint = robot.position;

    const delta = robot.radius * 2;
    let newGoal = midPoint;

    newGoal = shiftPointOfLineSegInDirOfPerpendicularBisector(
      midPoint.x,
      midPoint.y,
      robot.position.x,
      robot.position.y,
      closestPoint.x,
      closestPoint.y,
      delta,
    );

    if (!robot.pointIsReachableInEnvBounds(newGoal)) {
      translationVec.x *= -1;
      translationVec.y *= -1;

      midPoint = translatePointInDirection(
        robot.position.x,
        robot.position.y,
        translationVec.x,
        translationVec.y,
      );

      newGoal = midPoint;

      newGoal = shiftPointOfLineSegInDirOfPerpendicularBisector(
        midPoint.x,
        midPoint.y,
        robot.position.x,
        robot.position.y,
        closestPoint.x,
        closestPoint.y,
        delta,
      );
      // robot.curGoalTimeSteps = 0;
      robot.curGoalTimeSteps = robot.minCurGoalTimeSteps;
    } else {
      robot.curGoalTimeSteps = robot.minCurGoalTimeSteps;
    }

    return newGoal;
  }

  function getGoalFromEnvOrbit() {
    if (robot.curGoalTimeSteps < robot.minCurGoalTimeSteps && !robot.reachedGoal()) {
      robot.curGoalTimeSteps += 1;
      return robot.goal;
    }

    const environmentBounds = robot.scene.environmentBounds.map(
      (point) => ({ x: point[0], y: point[1] }),
    );

    const pointsCount = environmentBounds.length;
    const envRectSides = [];

    for (let index = 0; index < environmentBounds.length; index += 1) {
      const nextIndx = (index + 1) % pointsCount;
      envRectSides.push([environmentBounds[index], environmentBounds[nextIndx]]);
    }

    const allSides = [...envRectSides];

    robot.scene.staticObjects
      .filter((obj) => !obj.def.skipOrbit)
      .map((ob) => ob.sides)
      .forEach((sides) => allSides.push(...sides));

    const closestPointsToSides = allSides.map(
      (side) => closestPointInLineSegToPoint(
        robot.position.x,
        robot.position.y,
        side[0].x,
        side[0].y,
        side[1].x,
        side[1].y,
      ),
    );

    let closestPoint = closestPointsToSides.reduce((acc, cur) => {
      const condNotReached = robot.getDistanceTo(cur) > 50 || true;
      // const condNotReached = !robot.reached(cur);
      const condFirstCorner = acc == null;
      const condClosestThanAcc = condFirstCorner
      || robot.getDistanceTo(cur) < robot.getDistanceTo(acc);
      if (condNotReached && (condFirstCorner || condClosestThanAcc)) {
        return cur;
      }
      return acc;
    }, null);

    for (let index = 0; index < closestPointsToSides.length; index += 1) {
      const p = closestPointsToSides[index];
      if (robot.getDistanceTo(p) < 5) {
        closestPoint = closestPointsToSides[(index + 1) % (closestPointsToSides.length)];
      }
    }

    const newGoal = robot.algorithmOptions.environmentOrbit
      ? getGoalFromClosestPointToEnvBounds(closestPoint)
      : getRandPoint();

    return newGoal;
  }

  function getGoalFromStuckManeuver() {
    const envOrbitGoal = getGoalFromEnvOrbit();
    const vecToEnvOrbitGoal = {
      x: envOrbitGoal.x - robot.position.x,
      y: envOrbitGoal.y - robot.position.y,
    };
    const rotatedEnvOribtGoal = {
      x: -1 * vecToEnvOrbitGoal.y,
      y: vecToEnvOrbitGoal.x,
    };
    const newGoal = {
      x: robot.position.x + rotatedEnvOribtGoal.x,
      y: robot.position.y + rotatedEnvOribtGoal.y,
    };
    return newGoal;
  }

  function getNormalizedAngleToPuck(puck) {
    const angle = angleBetweenThreePointsDeg(robot.position, puck.position, puck.goal);
    const normalizedAngle = Math.abs(angle - 180);
    return normalizedAngle;
  }

  function getGoalFromPuck(puck) {
    const normalizedAngle = getNormalizedAngleToPuck(puck);

    if (normalizedAngle < ANGLE_OPTIMAL_THRESHOLD) {
      return puck.position;
    }

    const closestPointInLine = closestPointInLineToPoint(
      robot.position.x,
      robot.position.y,
      puck.position.x,
      puck.position.y,
      puck.goal.x,
      puck.goal.y,
    );

    if (normalizedAngle < ANGLE_ACCEPTABLE_THRESHOLD) {
      return closestPointInLine;
    }

    return getGoalFromEnvOrbit(robot);
  }

  function selectBestNearbyPuck() {
    if (robot.curGoalTimeSteps < robot.minCurGoalTimeSteps && !robot.reachedGoal()) {
      robot.curGoalTimeSteps += 1;
      return robot.bestPuck;
    }

    const angleRatings = [];
    const distanceRatings = [];

    robot.nearbyPucks
      .filter((p) => {
        if (!p.reachedGoal() && !p.isBlocked()) {
          const g = getGoalFromPuck(p);

          // Only Test this condition if enabled by robot algorithm options
          const condInRobotVorCell = robot.algorithmOptions.limitPuckSelectionToBVC
            ? pointIsInsidePolygon(p.position, robot.BVC)
            : true;

          const normalizedAngle = getNormalizedAngleToPuck(p);
          const puckAngleAcceptable = normalizedAngle <= ANGLE_ACCEPTABLE_THRESHOLD;

          const condReachableInEnv = robot.pointIsReachableInEnvBounds(g);
          // TODO: disabel after global planning was implemented
          const condReachableOutOfStaticObs = true; // robot.pointIsReachableOutsideStaticObs(g);
          return condInRobotVorCell
            && puckAngleAcceptable
            && condReachableInEnv
            && condReachableOutOfStaticObs;
        }
        return false;
      })
      .forEach((p) => {
        angleRatings.push([p, angleBetweenThreePointsDeg(robot.position, p.position, p.goal)]);
        distanceRatings.push([p, robot.getDistanceTo(p.position)]);
      });

    angleRatings.sort((a, b) => b[1] - a[1]);
    distanceRatings.sort((a, b) => a[1] - b[1]);

    const angleRatsExist = angleRatings.length > 0;
    const distRatsExist = distanceRatings.length > 0;

    let bestPuck = null;

    if (angleRatsExist) {
      bestPuck = angleRatings[0][0];
    } else if (distRatsExist && Math.random() < 0.3) {
      bestPuck = distanceRatings[0][0];
    }
    robot.bestPuck = bestPuck;

    if (bestPuck !== null) {
      robot.curGoalTimeSteps = 0;
    }
    return bestPuck;
  }

  return () => {
    // If robot was stuck and is still recovering, do not change robot goal
    if (stuck && avoidingStuckDuration <= MIN_STUCK_MANEUVER_DURATION) {
      avoidingStuckDuration += 1;
      return;
    }
    // Else, consider maneuver over, reset counters
    stuck = false;
    avoidingStuckDuration = 0;

    // Calc distance to last recorded position
    const distToLastPos = lastPosition
      ? distanceBetween2Points(robot.position, lastPosition)
      : null;

    // If robot is close enough to be considered at same position
    if (distToLastPos != null && distToLastPos <= SAME_POSITION_DISTANCE_THRESHOLD) {
      // Do not change recorded position, increment stuck timer by 1
      durationAtCurPosition += 1;
    }

    // If stuck timer, reaches threshold to be considered stuck
    if (durationAtCurPosition >= STUCK_DURATION_THRESHOLD) {
      // Reset stuck timer, set state to stuck, start stuck maneuver timer and start maneuver
      durationAtCurPosition = 0;
      stuck = true;
      avoidingStuckDuration = 0;
      robot.goal = getGoalFromStuckManeuver();
      console.log(`Starting Stuck Maneuver for Robot ${robot.id}`);
      return;
    }

    // Update last position and continuer normal operations
    lastPosition = { ...robot.position };
    const bestPuck = selectBestNearbyPuck();
    if (bestPuck === null) {
      robot.goal = getGoalFromEnvOrbit();
    } else {
      robot.goal = getGoalFromPuck(bestPuck);
    }
  };
}
