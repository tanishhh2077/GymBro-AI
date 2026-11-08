import { describe, expect, it } from "vitest";
import { KEY_JOINTS, POSE, POSE_CONNECTIONS, TOTAL_LANDMARKS } from "./landmarks";

describe("landmarks topology", () => {
  it("defines exactly 33 landmarks for the BlazePose topology", () => {
    expect(TOTAL_LANDMARKS).toBe(33);
    expect(Object.keys(POSE)).toHaveLength(33);
  });

  it("assigns contiguous zero-based indices from 0 to 32 without duplicates", () => {
    const indices = Object.values(POSE);
    expect(indices).toHaveLength(33);

    const unique = new Set(indices);
    expect(unique.size).toBe(33);

    const sorted = [...indices].sort((a, b) => a - b);
    expect(sorted[0]).toBe(0);
    expect(sorted[sorted.length - 1]).toBe(TOTAL_LANDMARKS - 1);
    for (let i = 0; i < TOTAL_LANDMARKS; i++) {
      expect(sorted[i]).toBe(i);
    }
  });

  it("identifies head and face landmark constants accurately", () => {
    expect(POSE.NOSE).toBe(0);
    expect(POSE.LEFT_EYE_INNER).toBe(1);
    expect(POSE.LEFT_EYE).toBe(2);
    expect(POSE.LEFT_EYE_OUTER).toBe(3);
    expect(POSE.RIGHT_EYE_INNER).toBe(4);
    expect(POSE.RIGHT_EYE).toBe(5);
    expect(POSE.RIGHT_EYE_OUTER).toBe(6);
    expect(POSE.LEFT_EAR).toBe(7);
    expect(POSE.RIGHT_EAR).toBe(8);
    expect(POSE.MOUTH_LEFT).toBe(9);
    expect(POSE.MOUTH_RIGHT).toBe(10);
  });

  it("identifies upper body and arm landmark constants accurately", () => {
    expect(POSE.LEFT_SHOULDER).toBe(11);
    expect(POSE.RIGHT_SHOULDER).toBe(12);
    expect(POSE.LEFT_ELBOW).toBe(13);
    expect(POSE.RIGHT_ELBOW).toBe(14);
    expect(POSE.LEFT_WRIST).toBe(15);
    expect(POSE.RIGHT_WRIST).toBe(16);
    expect(POSE.LEFT_PINKY).toBe(17);
    expect(POSE.RIGHT_PINKY).toBe(18);
    expect(POSE.LEFT_INDEX).toBe(19);
    expect(POSE.RIGHT_INDEX).toBe(20);
    expect(POSE.LEFT_THUMB).toBe(21);
    expect(POSE.RIGHT_THUMB).toBe(22);
  });

  it("identifies lower body and leg landmark constants accurately", () => {
    expect(POSE.LEFT_HIP).toBe(23);
    expect(POSE.RIGHT_HIP).toBe(24);
    expect(POSE.LEFT_KNEE).toBe(25);
    expect(POSE.RIGHT_KNEE).toBe(26);
    expect(POSE.LEFT_ANKLE).toBe(27);
    expect(POSE.RIGHT_ANKLE).toBe(28);
    expect(POSE.LEFT_HEEL).toBe(29);
    expect(POSE.RIGHT_HEEL).toBe(30);
    expect(POSE.LEFT_FOOT_INDEX).toBe(31);
    expect(POSE.RIGHT_FOOT_INDEX).toBe(32);
  });

  it("maintains side symmetry for all paired limb landmarks", () => {
    const limbPairs: Array<[number, number]> = [
      [POSE.LEFT_SHOULDER, POSE.RIGHT_SHOULDER],
      [POSE.LEFT_ELBOW, POSE.RIGHT_ELBOW],
      [POSE.LEFT_WRIST, POSE.RIGHT_WRIST],
      [POSE.LEFT_PINKY, POSE.RIGHT_PINKY],
      [POSE.LEFT_INDEX, POSE.RIGHT_INDEX],
      [POSE.LEFT_THUMB, POSE.RIGHT_THUMB],
      [POSE.LEFT_HIP, POSE.RIGHT_HIP],
      [POSE.LEFT_KNEE, POSE.RIGHT_KNEE],
      [POSE.LEFT_ANKLE, POSE.RIGHT_ANKLE],
      [POSE.LEFT_HEEL, POSE.RIGHT_HEEL],
      [POSE.LEFT_FOOT_INDEX, POSE.RIGHT_FOOT_INDEX],
    ];

    for (const [left, right] of limbPairs) {
      expect(right).toBe(left + 1);
      expect(left % 2).toBe(1); // Left limb joints are odd-numbered
      expect(right % 2).toBe(0); // Right limb joints are even-numbered
    }
  });

  describe("KEY_JOINTS", () => {
    it("contains exactly 12 major torso and limb joints", () => {
      expect(KEY_JOINTS).toHaveLength(12);
    });

    it("includes shoulders, elbows, wrists, hips, knees, and ankles for both sides", () => {
      const expected = [
        POSE.LEFT_SHOULDER,
        POSE.RIGHT_SHOULDER,
        POSE.LEFT_ELBOW,
        POSE.RIGHT_ELBOW,
        POSE.LEFT_WRIST,
        POSE.RIGHT_WRIST,
        POSE.LEFT_HIP,
        POSE.RIGHT_HIP,
        POSE.LEFT_KNEE,
        POSE.RIGHT_KNEE,
        POSE.LEFT_ANKLE,
        POSE.RIGHT_ANKLE,
      ];
      expect([...KEY_JOINTS]).toEqual(expected);
    });

    it("contains only unique and valid landmark indices", () => {
      const unique = new Set(KEY_JOINTS);
      expect(unique.size).toBe(KEY_JOINTS.length);
      for (const joint of KEY_JOINTS) {
        expect(joint).toBeGreaterThanOrEqual(0);
        expect(joint).toBeLessThan(TOTAL_LANDMARKS);
      }
    });

    it("excludes facial features and distal digits from key joints", () => {
      const nonKeyLandmarks = [
        POSE.NOSE,
        POSE.LEFT_EYE_INNER,
        POSE.LEFT_EYE,
        POSE.LEFT_EYE_OUTER,
        POSE.RIGHT_EYE_INNER,
        POSE.RIGHT_EYE,
        POSE.RIGHT_EYE_OUTER,
        POSE.LEFT_EAR,
        POSE.RIGHT_EAR,
        POSE.MOUTH_LEFT,
        POSE.MOUTH_RIGHT,
        POSE.LEFT_PINKY,
        POSE.RIGHT_PINKY,
        POSE.LEFT_INDEX,
        POSE.RIGHT_INDEX,
        POSE.LEFT_THUMB,
        POSE.RIGHT_THUMB,
        POSE.LEFT_HEEL,
        POSE.RIGHT_HEEL,
        POSE.LEFT_FOOT_INDEX,
        POSE.RIGHT_FOOT_INDEX,
      ];
      for (const lm of nonKeyLandmarks) {
        expect(KEY_JOINTS).not.toContain(lm);
      }
    });
  });

  describe("POSE_CONNECTIONS", () => {
    it("defines 18 edges for the lifter skeleton overlay", () => {
      expect(POSE_CONNECTIONS).toHaveLength(18);
    });

    it("connects only distinct, valid landmark indices for each edge", () => {
      for (const [from, to] of POSE_CONNECTIONS) {
        expect(from).toBeGreaterThanOrEqual(0);
        expect(from).toBeLessThan(TOTAL_LANDMARKS);
        expect(to).toBeGreaterThanOrEqual(0);
        expect(to).toBeLessThan(TOTAL_LANDMARKS);
        expect(from).not.toBe(to);
      }
    });

    it("contains no duplicate undirected edges", () => {
      const edgeSignatures = new Set<string>();
      for (const [a, b] of POSE_CONNECTIONS) {
        const key = a < b ? `${a}-${b}` : `${b}-${a}`;
        expect(edgeSignatures.has(key)).toBe(false);
        edgeSignatures.add(key);
      }
      expect(edgeSignatures.size).toBe(POSE_CONNECTIONS.length);
    });

    it("forms a closed torso rectangle", () => {
      const torsoJoints: readonly number[] = [
        POSE.LEFT_SHOULDER,
        POSE.RIGHT_SHOULDER,
        POSE.LEFT_HIP,
        POSE.RIGHT_HIP,
      ];
      const torsoEdges = POSE_CONNECTIONS.filter(
        ([a, b]) => torsoJoints.includes(a) && torsoJoints.includes(b),
      );
      expect(torsoEdges).toEqual([
        [POSE.LEFT_SHOULDER, POSE.RIGHT_SHOULDER],
        [POSE.LEFT_SHOULDER, POSE.LEFT_HIP],
        [POSE.RIGHT_SHOULDER, POSE.RIGHT_HIP],
        [POSE.LEFT_HIP, POSE.RIGHT_HIP],
      ]);
    });

    it("defines symmetric arm connections", () => {
      expect(POSE_CONNECTIONS).toContainEqual([POSE.LEFT_SHOULDER, POSE.LEFT_ELBOW]);
      expect(POSE_CONNECTIONS).toContainEqual([POSE.LEFT_ELBOW, POSE.LEFT_WRIST]);
      expect(POSE_CONNECTIONS).toContainEqual([POSE.RIGHT_SHOULDER, POSE.RIGHT_ELBOW]);
      expect(POSE_CONNECTIONS).toContainEqual([POSE.RIGHT_ELBOW, POSE.RIGHT_WRIST]);
    });

    it("defines symmetric leg and foot triangle connections", () => {
      // Left leg & foot
      expect(POSE_CONNECTIONS).toContainEqual([POSE.LEFT_HIP, POSE.LEFT_KNEE]);
      expect(POSE_CONNECTIONS).toContainEqual([POSE.LEFT_KNEE, POSE.LEFT_ANKLE]);
      expect(POSE_CONNECTIONS).toContainEqual([POSE.LEFT_ANKLE, POSE.LEFT_HEEL]);
      expect(POSE_CONNECTIONS).toContainEqual([POSE.LEFT_HEEL, POSE.LEFT_FOOT_INDEX]);
      expect(POSE_CONNECTIONS).toContainEqual([POSE.LEFT_ANKLE, POSE.LEFT_FOOT_INDEX]);

      // Right leg & foot
      expect(POSE_CONNECTIONS).toContainEqual([POSE.RIGHT_HIP, POSE.RIGHT_KNEE]);
      expect(POSE_CONNECTIONS).toContainEqual([POSE.RIGHT_KNEE, POSE.RIGHT_ANKLE]);
      expect(POSE_CONNECTIONS).toContainEqual([POSE.RIGHT_ANKLE, POSE.RIGHT_HEEL]);
      expect(POSE_CONNECTIONS).toContainEqual([POSE.RIGHT_HEEL, POSE.RIGHT_FOOT_INDEX]);
      expect(POSE_CONNECTIONS).toContainEqual([POSE.RIGHT_ANKLE, POSE.RIGHT_FOOT_INDEX]);
    });
  });
});
