const lerpColor = (c1, c2, t) => {
  return [
    Math.floor(c1[0] + (c2[0] - c1[0]) * t),
    Math.floor(c1[1] + (c2[1] - c1[1]) * t),
    Math.floor(c1[2] + (c2[2] - c1[2]) * t),
  ];
}
