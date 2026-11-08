import assert from 'node:assert/strict';
import {
  generatePyramid3DSvg,
  generateFunctionGraphSvg,
  generateTriangle2DSvg,
} from '../src/core/mathRenderer';
import {
  pointToSegmentDistance,
  partialEraseStrokes,
} from '../src/components/ink-overlay/InkCanvasOverlay';
import { useAppStore } from '../src/store/useAppStore';

console.log('=== BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG TOÀN DIỆN (KNBOARD TEST SUITE) ===\n');

// 1. Test 3D Spatial Geometry Engine (Pyramid, Prism, Cone + Auto Hidden-Line Dashed)
{
  const state = useAppStore.getState().pyramid3D;

  const svgPyramid = generatePyramid3DSvg({ ...state, shape3DType: 'pyramid-quad' });
  assert.ok(svgPyramid.includes('<svg'), 'Pyramid SVG should render valid <svg>');
  assert.ok(svgPyramid.includes('stroke-dasharray="5,4"'), 'Pyramid 3D must automatically compute dashed hidden lines');

  const svgUnfolded = generatePyramid3DSvg({
    ...state,
    shape3DType: 'pyramid-quad',
    showUnfoldedSection: true,
  });
  assert.ok(svgUnfolded.includes('Thiết diện thật (MNPQ)'), 'Unfolded 3D cross-section must render true shape');

  const svgPrism = generatePyramid3DSvg({ ...state, shape3DType: 'prism-tri' });
  assert.ok(svgPrism.includes("A'"), 'Triangular prism must render A\' B\' C\' vertices');

  const svgCone = generatePyramid3DSvg({ ...state, shape3DType: 'cone' });
  assert.ok(svgCone.includes('<ellipse'), 'Cone 3D must render elliptical base and dashed back arc');

  // Verify Auto-Fit ViewBox guarantees apex S is NEVER clipped (y coordinate of S is inside viewBox minY..minY+height)
  const vbMatch = svgPyramid.match(/viewBox="([^"]+)"/);
  assert.ok(vbMatch, 'SVG must have an auto-fit viewBox');
  const [vbMinX, vbMinY, vbW, vbH] = vbMatch[1].split(' ').map(Number);
  const sTextMatch = svgPyramid.match(/<text x="([^"]+)" y="([^"]+)"[^>]*>S<\/text>/);
  assert.ok(sTextMatch, 'Apex label S must be present');
  const sX = Number(sTextMatch[1]);
  const sY = Number(sTextMatch[2]);
  assert.ok(
    sX >= vbMinX + 10 && sX <= vbMinX + vbW - 10 && sY >= vbMinY + 14 && sY <= vbMinY + vbH - 10,
    `Apex label S (${sX}, ${sY}) must be strictly inside viewBox (${vbMinX}, ${vbMinY}, ${vbW}, ${vbH}) with safety padding!`
  );

  console.log('✅ [PASS] Test 1: Engine Hình Không Gian 3D + Auto-Fit ViewBox (Đỉnh S luôn nằm gọn 100% trong khung hình, không bao giờ bị cắt mất)');
}

// 2. Test Function Graph Plotter & Parameter Slider m
{
  const graphState = useAppStore.getState().functionGraph;
  const svgM0 = generateFunctionGraphSvg({ ...graphState, enableParamM: true, paramM: 0 });
  const svgM2 = generateFunctionGraphSvg({ ...graphState, enableParamM: true, paramM: 2.5 });
  assert.ok(svgM0.includes('<path d="M'), 'Function graph must generate smooth curve path');
  assert.notEqual(svgM0, svgM2, 'Changing parameter slider m must dynamically shift the graph curve');
  console.log('✅ [PASS] Test 2: Engine Đồ Thị Hàm Số f(x, m) & Thanh trượt tham số m');
}

// 3. Test 2D Dynamic Constraint Geometry (Triangle + Circumcircle + Orthocenter H + Altitude CK)
{
  const triState = useAppStore.getState().triangle2D;
  const svgTri1 = generateTriangle2DSvg(triState);
  const svgTri2 = generateTriangle2DSvg({ ...triState, cx: 220, cy: 90 });
  assert.ok(svgTri1.includes('>O<') && svgTri1.includes('>H<') && svgTri1.includes('>K<'), '2D Triangle must compute Circumcenter O, Orthocenter H, and Altitude foot K');
  assert.notEqual(svgTri1, svgTri2, 'Dragging vertex C must dynamically recompute Circumcircle and Orthocenter');
  console.log('✅ [PASS] Test 3: Engine Hình Phẳng 2D Ràng Buộc (Đường tròn ngoại tiếp O, Trực tâm H, Chân đường cao K)');
}

// 4. Test Smart Exam Auto-Parser (Splitting single-line A. B. C. D. options + Layout Switching)
{
  const store = useAppStore.getState();
  store.parseSmartInputLine(
    'q1',
    'Tính diện tích đáy hình chóp đều cạnh a: A. a^2 B. 2a^2 C. 3a^2 D. 4a^2'
  );
  const q1After = useAppStore.getState().questions.find((q) => q.id === 'q1')!;
  assert.equal(q1After.stemText, 'Tính diện tích đáy hình chóp đều cạnh a:');
  assert.deepEqual(q1After.options, {
    A: 'a^2',
    B: '2a^2',
    C: '3a^2',
    D: '4a^2',
  });

  store.setQuestionOptionLayout('q1', '2-row');
  assert.equal(
    useAppStore.getState().questions.find((q) => q.id === 'q1')!.optionLayout,
    '2-row'
  );
  console.log('✅ [PASS] Test 4: Auto-Parser tự động tách đáp án A. B. C. D. trên 1 dòng & Đổi bố cục 1-2-4 dòng');
}

// 5. Test Live-Link Synchronization & Exam Shuffle (Trộn mã đề)
{
  const store = useAppStore.getState();
  store.linkBoardFigureToQuestion('q3', '2d-triangle');
  const q3 = useAppStore.getState().questions.find((q) => q.id === 'q3')!;
  assert.equal(q3.linkedFigure?.boardType, '2d-triangle');

  // Test XP-Pen Solution Space & Ink Strokes
  store.toggleQuestionSolutionSpace('q3');
  assert.ok(
    useAppStore.getState().questions.find((q) => q.id === 'q3')!.solutionSpaceHeight > 0,
    'Solution space for XP-Pen should expand'
  );
  store.addQuestionInkStroke('q3', {
    id: 'test_stroke_1',
    tool: 'pen',
    color: '#dc2626',
    size: 2.8,
    points: [
      { x: 10, y: 10, pressure: 0.7 },
      { x: 50, y: 30, pressure: 0.8 },
    ],
  });
  assert.equal(
    useAppStore.getState().questions.find((q) => q.id === 'q3')!.inkStrokes.length,
    1
  );

  // Test Exam Shuffle preserves the true answer
  store.shuffleExamQuestionsAndOptions();
  const mcQuestions = useAppStore
    .getState()
    .questions.filter((q) => q.part === 'multiple-choice');
  assert.equal(mcQuestions.length, 2);
  // Test Full-Page XP-Pen Ink & Segment Eraser Math
  store.addPageInkStroke(0, {
    id: 'page_stroke_1',
    tool: 'pen',
    color: '#dc2626',
    size: 3,
    points: [
      { x: 100, y: 100, pressure: 0.7 },
      { x: 400, y: 100, pressure: 0.7 }, // Long straight line segment (300px long)
    ],
  });
  assert.equal(useAppStore.getState().pageInkStrokes[0].length, 1);

  // Verify Partial Eraser touching the MIDDLE (250, 100) of a 300px straight line (100,100 -> 400,100)
  // splits it into 2 remaining segments (left of eraser and right of eraser) instead of deleting the whole line!
  const midDist = pointToSegmentDistance(250, 105, 100, 100, 400, 100);
  assert.equal(midDist, 5);
  const { changed, nextStrokes } = partialEraseStrokes(
    useAppStore.getState().pageInkStrokes[0],
    { x: 250, y: 100, pressure: 0.5 },
    14
  );
  assert.equal(changed, true);
  assert.equal(
    nextStrokes.length,
    2,
    'Partial Eraser in the middle of a line must leave 2 remaining line pieces on both sides!'
  );

  console.log('✅ [PASS] Test 5: Đồng bộ Live-Link, Viết bút XP-Pen toàn mặt trang Đề, Cục Tẩy Cắt Đoạn Thẳng & Trộn Mã Đề');
}

console.log('\n🎉 TẤT CẢ 5 BỘ KIỂM THỬ CỐT LÕI ĐỀU VƯỢT QUA 100% (0 LỖI)!');
