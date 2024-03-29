/* eslint-disable no-use-before-define */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-unused-vars */
/*
 ************************************************
 *************** Helper Functions ***************
 ************************************************
 */

function radToDeg(radians) {
  return radians * (180 / Math.PI);
}

/*
* Calculates the angle ABC (in radians)
*
* A first point, ex: {x: 0, y: 0}
* C second point
* B center point
*/
function angleBetweenThreePointsRad(A, B, C) {
  const AB = Math.sqrt((B.x - A.x) ** 2 + (B.y - A.y) ** 2);
  const BC = Math.sqrt((B.x - C.x) ** 2 + (B.y - C.y) ** 2);
  const AC = Math.sqrt((C.x - A.x) ** 2 + (C.y - A.y) ** 2);

  return Math.acos((BC * BC + AB * AB - AC * AC) / (2 * BC * AB));
}

function angleBetweenThreePointsDeg(A, B, C) {
  const angleRad = angleBetweenThreePointsRad(A, B, C);
  return radToDeg(angleRad);
}

/** * Ruler Function */
function pointOnLineSegmentPerRatio(startPoint, endPoint, ratio) {
  return {
    x: (1 - ratio) * startPoint.x + ratio * endPoint.x,
    y: (1 - ratio) * startPoint.y + ratio * endPoint.y,
  };
}

function nxtCircIndx(i, length) {
  return (i + 1) % length;
}

function minDistanceToLine(pointsArray, vecStart, vecEnd) {
  let minDist = null;

  for (const p of pointsArray) {
    const curDist = distanceBetweenPointAndLine(p,
      vecStart,
      vecEnd);

    if (minDist == null) {
      minDist = curDist;
    } else if (curDist < minDist) {
      minDist = curDist;
    }
  }

  return minDist;
}

function allPointsAreOnSameSideOfVector(pointsArray, vecStart, vecEnd) {
  let prevSide = null;

  for (const p of pointsArray) {
    const curSide = pointIsOnRightSideOfVector(p.x, p.y,
      vecStart.x, vecStart.y,
      vecEnd.x, vecEnd.y);

    if (prevSide == null) {
      prevSide = pointIsOnRightSideOfVector(p.x, p.y,
        vecStart.x, vecStart.y,
        vecEnd.x, vecEnd.y);
    } else if (curSide !== prevSide) {
      return false;
    }
  }

  return true;
}

function dotProduct(vec1, vec2) {
  return vec1.x * vec2.x + vec1.y * vec2.y;
}

function pointIsOnRightSideOfVector(x, y, x1, y1, x2, y2) {
  const vec1 = { x: x - x1, y: -y + y1 };
  const rot90Vec1 = { x: -1 * vec1.y, y: vec1.x };
  const vec2 = { x: x2 - x1, y: -y2 + y1 };

  const dot2 = dotProduct(rot90Vec1, vec2);
  return dot2 > 0;
}

function closestPointInPolygonToPoint(polygon, point) {
  let closestPoint = null;
  let minDist = null;

  for (let index = 0; index < polygon.length; index += 1) {
    const v1 = polygon[index];
    const v2 = polygon[nxtCircIndx(index, polygon.length)];
    const closestPointInLineSeg = closestPointInLineSegToPoint(
      point.x,
      point.y,
      v1[0],
      v1[1],
      v2[0],
      v2[1],
    );

    const distGoalToLineSeg = distanceBetween2Points(point, closestPointInLineSeg);

    if (closestPoint == null || distGoalToLineSeg < minDist) {
      closestPoint = { x: closestPointInLineSeg.x, y: closestPointInLineSeg.y };
      minDist = distGoalToLineSeg;
    }
  }

  return closestPoint;
}

function closestPointInLineToPoint(x, y, x1, y1, x2, y2) {
  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  // in case of 0 length line
  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  const xx = x1 + param * C;
  const yy = y1 + param * D;

  return { x: xx, y: yy };
}

function closestPointInLineSegToPoint(x, y, x1, y1, x2, y2) {
  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  // in case of 0 length line
  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx;
  let yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  return { x: xx, y: yy };
}

function distanceBetween2Points(pos1, pos2) {
  if (
    pos1 == null || pos2 == null
    || pos1.x == null || pos1.y == null
    || pos2.x == null || pos2.y == null
  ) {
    return null;
  }

  const ret = Math.sqrt(
    (pos1.x - pos2.x) * (pos1.x - pos2.x) + (pos1.y - pos2.y) * (pos1.y - pos2.y),
  );
  return ret;
}

function distanceBetweenPointAndLine(point, point1LineSeg, point2LineSeg) {
  const ret = distanceBetween2Points(
    point,
    closestPointInLineToPoint(
      point.x,
      point.y,
      point1LineSeg.x,
      point1LineSeg.y,
      point2LineSeg.x,
      point2LineSeg.y,
    ),
  );
  return ret;
}

function distanceBetweenPointAndLineSeg(point, point1LineSeg, point2LineSeg) {
  const ret = distanceBetween2Points(
    point,
    closestPointInLineSegToPoint(
      point.x,
      point.y,
      point1LineSeg.x,
      point1LineSeg.y,
      point2LineSeg.x,
      point2LineSeg.y,
    ),
  );
  return ret;
}

function midPointOfLineSeg(x1, y1, x2, y2) {
  return { x: (x1 + x2) / 2, y: (y1 + y2) / 2 };
}

function slopeOfLineSeg(x1, y1, x2, y2) {
  if ((x2 - x1) === 0) {
    return 99999999999;
  }
  return (y2 - y1) / (x2 - x1);
}

function slopeOfPerpendicularBisectorOfLineSeg(x1, y1, x2, y2) {
  return -1 / slopeOfLineSeg(x1, y1, x2, y2);
}

function directionOfPerpendicularBisector(x1, y1, x2, y2, scale) {
  const length = distanceBetween2Points({ x: x1, y: y1 }, { x: x2, y: y2 });
  return { x: (scale * (y1 - y2)) / length, y: (scale * (x2 - x1)) / length };
}

function translatePointInDirection(x1, y1, xVec, yVec) {
  return { x: x1 + xVec, y: y1 + yVec };
}

function shiftPointOfLineSegInDirOfPerpendicularBisector(x, y, x1, y1, x2, y2, scale) {
  const dir = directionOfPerpendicularBisector(x1, y1, x2, y2, scale);
  const p1 = translatePointInDirection(x, y, dir.x, dir.y);
  return p1;
}

function shiftLineSegInDirOfPerpendicularBisector(x1, y1, x2, y2, scale) {
  const dir = directionOfPerpendicularBisector(x1, y1, x2, y2, scale);
  const p1 = translatePointInDirection(x1, y1, dir.x, dir.y);
  const p2 = translatePointInDirection(x2, y2, dir.x, dir.y);
  return [p1, p2];
}

function getLineLineIntersectionPoint(
  line1StartX,
  line1StartY,
  line1EndX,
  line1EndY,
  line2StartX,
  line2StartY,
  line2EndX,
  line2EndY,
) {
  // if the lines intersect,
  // the result contains the x and y of the intersection (treating the lines as infinite)
  // and booleans for whether line segment 1 or line segment 2 contain the point
  let a;
  let b;
  const result = {
    x: null,
    y: null,
    onLine1: false,
    onLine2: false,
  };

  const denominator = ((line2EndY - line2StartY) * (line1EndX - line1StartX))
                - ((line2EndX - line2StartX) * (line1EndY - line1StartY));

  if (denominator === 0) {
    return result;
  }

  a = line1StartY - line2StartY;
  b = line1StartX - line2StartX;

  const numerator1 = ((line2EndX - line2StartX) * a) - ((line2EndY - line2StartY) * b);
  const numerator2 = ((line1EndX - line1StartX) * a) - ((line1EndY - line1StartY) * b);

  a = numerator1 / denominator;
  b = numerator2 / denominator;

  // if we cast these lines infinitely in both directions, they intersect here:
  result.x = line1StartX + (a * (line1EndX - line1StartX));
  result.y = line1StartY + (a * (line1EndY - line1StartY));
  /*
      // it is worth noting that this should be the same as:
      x = line2StartX + (b * (line2EndX - line2StartX));
      y = line2StartX + (b * (line2EndY - line2StartY));
      */
  // if line1 is a segment and line2 is infinite, they intersect if:
  if (a > 0 && a < 1) {
    result.onLine1 = true;
  }
  // if line2 is a segment and line1 is infinite, they intersect if:
  if (b > 0 && b < 1) {
    result.onLine2 = true;
  }
  // if line1 and line2 are segments, they intersect if both of the above are true
  return result;
}

function pointIsInsidePolygon(point, polygon) {
  // ray-casting algorithm based on
  // http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html

  const { x } = point; const { y } = point;

  let inside = false;
  try {
    // eslint-disable-next-line no-plusplus
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i][0]; const yi = polygon[i][1];
      const xj = polygon[j][0]; const yj = polygon[j][1];

      const intersect = ((yi > y) !== (yj > y))
              && (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }

    return inside;
  } catch (err) {
    return false;
  }
}

function polygonArea(polygon) {
  if (polygon === undefined || polygon.length < 3) {
    return 0;
  }

  let area = 0; // Accumulates area in the loop
  let j = polygon.length - 1; // The last vertex is the 'previous' one to the first

  for (let i = 0; i < polygon.length; i += 1) {
    area += (polygon[j][0] + polygon[i][0]) * (polygon[j][1] - polygon[i][1]);
    j = i; // j is previous vertex to i
  }
  return Math.abs(area / 2);
}

function circleArea(radius) {
  return (radius * radius * Math.PI);
}

function xyPoint(p) {
  return { x: p[0], y: p[1] };
}

// Static obstacles

/**
 * Finds the intersection between a circles border
 * and a line from the origin to the otherLineEndPoint.
 * @param  {Vector} center            - center of the circle and start of the line
 * @param  {number} radius            - radius of the circle
 * @param  {Vector} otherLineEndPoint - end of the line
 * @return {Vector}                   - point of the intersection
 */
function getLineCircleIntersectionPoint(center, radius, otherLineEndPoint) {
  let v = { x: otherLineEndPoint.x - center.x, y: otherLineEndPoint.y - center.y };
  const lineLength = distanceBetween2Points(v, { x: 0, y: 0 });
  if (lineLength === 0) {
    throw new Error('Cannot get intersection point between line and circle, end point is same as center!');
  }
  v = { x: v.x / lineLength, y: v.y / lineLength };
  return { x: center.x + v.x * radius, y: center.y + v.y * radius };
}

// console.log('0,1', getLineCircleIntersectionPoint({ x: 0, y: 0 }, 1, { x: 0, y: 10 }));
// console.log('0,5', getLineCircleIntersectionPoint({ x: 0, y: 0 }, 5, { x: 0, y: 10 }));
// console.log('0,-5', getLineCircleIntersectionPoint({ x: 0, y: -10 }, 5, { x: 0, y: 10 }));
// console.log('7,0', getLineCircleIntersectionPoint({ x: 10, y: 0 }, 3, { x: 0, y: 0 }));
