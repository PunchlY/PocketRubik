import { CT, Rubik, isNumber } from './rubik.js';
const Turns = [
    ...Rubik.R, ...Rubik.U, ...Rubik.F,
    ...Rubik.L, ...Rubik.D, ...Rubik.B,
];
const TurnNames = [
    'R', 'R2', 'R\'',
    'U', 'U2', 'U\'',
    'F', 'F2', 'F\'',
    'L', 'L2', 'L\'',
    'D', 'D2', 'D\'',
    'B', 'B2', 'B\'',
    'X', 'X2', 'X\'',
    'Y', 'Y2', 'Y\'',
    'Z', 'Z2', 'Z\'',
];
const Base = [
    ,
    [1, 2, 0, 4, 5, 3], [2, 0, 1, 5, 3, 4],
    [2, 1, 3, 5, 4, 0], [1, 3, 2, 4, 0, 5], [3, 2, 1, 0, 5, 4],
    [5, 1, 0, 2, 4, 3], [1, 0, 5, 4, 3, 2], [0, 5, 1, 3, 2, 4],
    [3, 1, 5, 0, 4, 2], [1, 5, 3, 4, 2, 0], [5, 3, 1, 2, 0, 4],
    [2, 4, 0, 5, 1, 3], [4, 0, 2, 1, 3, 5], [0, 2, 4, 3, 5, 1],
    [3, 4, 2, 0, 1, 5], [4, 2, 3, 1, 5, 0], [2, 3, 4, 5, 0, 1],
    [0, 4, 5, 3, 1, 2], [4, 5, 0, 1, 2, 3], [5, 0, 4, 2, 3, 1],
    [5, 4, 3, 2, 1, 0], [4, 3, 5, 1, 0, 2], [3, 5, 4, 0, 2, 1],
];
const TurnBase = [
    14, 18, 8,
    6, 9, 3,
    4, 15, 13,
    8, 18, 14,
    3, 9, 6,
    13, 15, 4,
    14, 18, 8,
    6, 9, 3,
    4, 15, 13,
].map((n) => Base[n]);
const Base_Base = Rubik.Base.map((c) => Array.from({ length: 24 }, ([C, T] = CT(c), i) => Base[C[i / 3] * 3 + (T[i / 3] + i) % 3]));
const Base_BaseT = Array.from({ length: 24 }, (v, i) => Rubik.Base.map((c) => Base[c.find(i)]));
const BaseT = Base_BaseT[0];
const BaseBaseT = Base_BaseT.map((l, i) => l[i]);
export class Build extends Array {
    constructor(build) {
        super();
        super.push(...Array.from(build));
    }
    copy() {
        return new Build(this);
    }
    mapping(graph) {
        if (!graph)
            return this;
        super.forEach((v, i) => super[i] = graph[~~(v / 3)] * 3 + v % 3);
        return this;
    }
    base(base) {
        Build.prototype.mapping.call(this, Base[base]);
        return this;
    }
    coordinate(coordinate) {
        Build.prototype.mapping.call(this, BaseT[coordinate]);
        return this;
    }
    similar(base) {
        const { mapping } = Build.prototype;
        mapping.call(this, Base[base]);
        mapping.call(this, BaseBaseT[base]);
        return this;
    }
    image() {
        super.forEach((v, i) => super[i] = (~~(v / 3) || 3) * 3 + (2 - v % 3));
        return this;
    }
    inverse() {
        super.reverse();
        super.forEach((v, i) => super[i] = ~~(v / 3) * 3 + (2 - v % 3));
        return this;
    }
    bits(t) {
        const st = ((r, st) => r ? st.reverse() : st)(t < 0 && (t = ~t, true), Array.from({ length: this.length }, (v = t & 1) => (t >>= 1, v)));
        const graph = [0, 1, 2, 3, 4, 5];
        st.forEach((b, i) => {
            let v = this[i];
            v = graph[~~(v / 3)] * 3 + v % 3;
            if (b ^ ~~(v / 9))
                graph.forEach((p, i) => graph[i] = TurnBase[v]?.[p] ?? p);
            super[i] = b * 9 + v % 9;
        });
        return this;
    }
    stringify() {
        return super.map((v) => TurnNames[v]).join('');
    }
}
export async function* Solver(eT, max = Infinity, i) {
    const n = isNumber(i) ? i * 3 : null;
    const set = new Set();
    let map = new Map([[Rubik.Base[0], []]]), _map = new Map(), l = 0;
    while (l - 1 < max && map.size) {
        for (const [rubik, build] of map) {
            if (set.has(rubik.position))
                continue;
            if ((() => {
                for (const { rubik: { position } } of rubik.similarlyNoCongruent(n, i))
                    if (set.has(position))
                        return false;
                return true;
            })())
                yield { rubik, build };
            for (const { rubik: { position } } of rubik.congruent(n, i))
                set.add(position);
            eT.filter((n) => !build.length || ~~((build.at(-1) - n) / 3)).forEach((n) => _map.set(rubik.action(Turns[n]).readonly(), [...build, n]));
            eT.filter((n) => !build.length || ~~((build.at(0) - n) / 3)).forEach((n) => _map.set(Turns[n].action(rubik).readonly(), [n, ...build]));
        }
        map = _map, _map = new Map(), l++;
    }
}
(function (Solver) {
    function solveRaw(rubik) {
        for (const { rubik: { position }, image, inverse, base, coordinate } of rubik.similarly()) {
            if (!(position in Solver.data))
                continue;
            const solve = new Build(Solver.data[position]);
            if (!inverse)
                solve.inverse();
            if (image)
                solve.image();
            return solve.base(((c) => image ? c.image() : c)(inverse ? base.inverse() : coordinate)[0]);
        }
        return false;
    }
    Solver.solveRaw = solveRaw;
    ;
    Rubik.prototype.solve = function solve(t = NaN) {
        const solve = solveRaw(this);
        if (!solve)
            return false;
        if (isNumber(t))
            solve.bits(t);
        return solve.stringify();
    };
    function solve(scr, t = NaN) {
        const rubik = new Rubik(0).do(scr);
        if (!rubik)
            return false;
        return rubik.solve(t);
    }
    Solver.solve = solve;
    function* solveAll(scr, reverse = false) {
        const rubik = new Rubik(0).do(scr);
        if (!rubik)
            return false;
        const solve = solveRaw(rubik);
        if (!solve)
            return false;
        const max = 1 << solve.length;
        for (let t = 0; t < max; t++)
            yield solve.bits(reverse ? ~t : t).stringify();
    }
    Solver.solveAll = solveAll;
})(Solver || (Solver = {}));
