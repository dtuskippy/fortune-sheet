import React, { useRef, useEffect, useContext, useCallback } from "react";
import {
  Canvas,
  updateContextWithCanvas,
  updateContextWithSheetData,
  groupValuesRefresh,
  handleGlobalWheel,
  formulaCache,
  initFreeze,
  Sheet as SheetType,
} from "@fortune-sheet/core";
import "./index.css";
import WorkbookContext from "../../context";
import SheetOverlay from "../SheetOverlay";

type Props = {
  sheet: SheetType;
};

const Sheet: React.FC<Props> = ({ sheet }) => {
  const { data } = sheet;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const placeholderRef = useRef<HTMLDivElement>(null);
  const { context, setContext, refs } = useContext(WorkbookContext);

  /**
   * Update data on window resize
   */
  useEffect(() => {
    function resize() {
      if (!data) return;
      setContext((draftCtx) => {
        updateContextWithSheetData(draftCtx, data);
        updateContextWithCanvas(
          draftCtx,
          canvasRef.current!,
          placeholderRef.current!
        );
      });
    }
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
    };
  }, [data, setContext]);

  /**
   * Recalculate row/col info when data changes
   */
  useEffect(() => {
    if (!data) return;
    setContext((draftCtx) => updateContextWithSheetData(draftCtx, data));
  }, [context.config?.rowlen, context.config?.columnlen, data, setContext]);

  /**
   * Init canvas
   */
  useEffect(() => {
    setContext((draftCtx) =>
      updateContextWithCanvas(
        draftCtx,
        canvasRef.current!,
        placeholderRef.current!
      )
    );
  }, [setContext]);

  /**
   * Recalculate freeze data when sheet changes or sheet.frozen changes
   * should be defined before redraw
   */
  useEffect(() => {
    initFreeze(context, refs.globalCache, context.currentSheetIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    refs.globalCache,
    sheet.frozen,
    context.currentSheetIndex,
    context.visibledatacolumn,
    context.visibledatarow,
  ]);

  /**
   * Redraw canvas When context changes
   * All context changes will trigger this
   */
  useEffect(() => {
    // update formula chains value first if not empty
    if (formulaCache.groupValuesRefreshData.length > 0) {
      const refreshData = formulaCache.groupValuesRefreshData;
      formulaCache.groupValuesRefreshData = [];
      setContext((draftCtx) => {
        groupValuesRefresh(draftCtx, refreshData);
      });
      return;
    }
    const tableCanvas = new Canvas(canvasRef.current!, context);
    const freeze = refs.globalCache.freezen?.[sheet.index!];
    if (
      freeze?.horizontal?.freezenhorizontaldata ||
      freeze?.vertical?.freezenverticaldata
    ) {
      // with frozen
      const horizontalData = freeze?.horizontal?.freezenhorizontaldata;
      const verticallData = freeze?.vertical?.freezenverticaldata;
      if (horizontalData && verticallData) {
        const [horizontalPx, , horizontalScrollTop] = horizontalData;
        const [verticalPx, , verticalScrollWidth] = verticallData;
        // main
        tableCanvas.drawMain({
          scrollWidth: context.scrollLeft + verticalPx - verticalScrollWidth,
          scrollHeight: context.scrollTop + horizontalPx - horizontalScrollTop,
          offsetLeft: verticalPx - verticalScrollWidth + context.rowHeaderWidth,
          offsetTop:
            horizontalPx - horizontalScrollTop + context.columnHeaderHeight,
          clear: true,
        });
        // right top
        tableCanvas.drawMain({
          scrollWidth: context.scrollLeft + verticalPx - verticalScrollWidth,
          scrollHeight: horizontalScrollTop,
          drawHeight: horizontalPx,
          offsetLeft: verticalPx - verticalScrollWidth + context.rowHeaderWidth,
        });
        // left down
        tableCanvas.drawMain({
          scrollWidth: verticalScrollWidth,
          scrollHeight: context.scrollTop + horizontalPx - horizontalScrollTop,
          drawWidth: verticalPx,
          offsetTop:
            horizontalPx - horizontalScrollTop + context.columnHeaderHeight,
        });
        // left top
        tableCanvas.drawMain({
          scrollWidth: verticalScrollWidth,
          scrollHeight: horizontalScrollTop,
          drawWidth: verticalPx,
          drawHeight: horizontalPx,
        });
        // headers
        tableCanvas.drawColumnHeader(
          context.scrollLeft + verticalPx - verticalScrollWidth,
          undefined,
          verticalPx - verticalScrollWidth + context.rowHeaderWidth
        );
        tableCanvas.drawColumnHeader(verticalScrollWidth, verticalPx);
        tableCanvas.drawRowHeader(
          context.scrollTop + horizontalPx - horizontalScrollTop,
          undefined,
          horizontalPx - horizontalScrollTop + context.columnHeaderHeight
        );
        tableCanvas.drawRowHeader(horizontalScrollTop, horizontalPx);
        tableCanvas.drawFreezeLine({
          horizontalTop:
            horizontalPx - horizontalScrollTop + context.columnHeaderHeight - 2,
          verticalLeft:
            verticalPx - verticalScrollWidth + context.rowHeaderWidth - 2,
        });
      } else if (horizontalData) {
        const [horizontalPx, , horizontalScrollTop] = horizontalData;
        // main
        tableCanvas.drawMain({
          scrollWidth: context.scrollLeft,
          scrollHeight: context.scrollTop + horizontalPx - horizontalScrollTop,
          offsetTop:
            horizontalPx - horizontalScrollTop + context.columnHeaderHeight,
          clear: true,
        });
        // top
        tableCanvas.drawMain({
          scrollWidth: context.scrollLeft,
          scrollHeight: horizontalScrollTop,
          drawHeight: horizontalPx,
        });
        // headers
        tableCanvas.drawColumnHeader(context.scrollLeft);
        tableCanvas.drawRowHeader(
          context.scrollTop + horizontalPx - horizontalScrollTop,
          undefined,
          horizontalPx - horizontalScrollTop + context.columnHeaderHeight
        );
        tableCanvas.drawRowHeader(horizontalScrollTop, horizontalPx);
        tableCanvas.drawFreezeLine({
          horizontalTop:
            horizontalPx - horizontalScrollTop + context.columnHeaderHeight - 2,
        });
      } else if (verticallData) {
        const [verticalPx, , verticalScrollWidth] = verticallData;
        // main
        tableCanvas.drawMain({
          scrollWidth: context.scrollLeft + verticalPx - verticalScrollWidth,
          scrollHeight: context.scrollTop,
          offsetLeft: verticalPx - verticalScrollWidth + context.rowHeaderWidth,
        });
        // left
        tableCanvas.drawMain({
          scrollWidth: verticalScrollWidth,
          scrollHeight: context.scrollTop,
          drawWidth: verticalPx,
        });
        // headers
        tableCanvas.drawRowHeader(context.scrollTop);
        tableCanvas.drawColumnHeader(
          context.scrollLeft + verticalPx - verticalScrollWidth,
          undefined,
          verticalPx - verticalScrollWidth + context.rowHeaderWidth
        );
        tableCanvas.drawColumnHeader(verticalScrollWidth, verticalPx);
        tableCanvas.drawFreezeLine({
          verticalLeft:
            verticalPx - verticalScrollWidth + context.rowHeaderWidth - 2,
        });
      }
    } else {
      // without frozen
      tableCanvas.drawMain({
        scrollWidth: context.scrollLeft,
        scrollHeight: context.scrollTop,
        clear: true,
      });
      tableCanvas.drawColumnHeader(context.scrollLeft);
      tableCanvas.drawRowHeader(context.scrollTop);
    }
  }, [context, refs.globalCache.freezen, setContext, sheet.index]);

  const onWheel = useCallback(
    (e: WheelEvent) => {
      setContext((draftCtx) => {
        handleGlobalWheel(
          draftCtx,
          e,
          refs.globalCache,
          refs.scrollbarX.current!,
          refs.scrollbarY.current!
        );
      });
    },
    [refs.globalCache, refs.scrollbarX, refs.scrollbarY, setContext]
  );

  /**
   * Bind wheel event.
   * Note: cannot use onWheel directly on the container because it behaves strange
   */
  useEffect(() => {
    const container = containerRef.current;
    container?.addEventListener("wheel", onWheel);
    return () => {
      container?.removeEventListener("wheel", onWheel);
    };
  }, [onWheel]);

  return (
    <div ref={containerRef} className="fortune-sheet-container">
      {/* this is a placeholder div to help measure the empty space between toolbar and footer, directly measuring the canvas element is inaccurate, don't know why */}
      <div ref={placeholderRef} className="fortune-sheet-canvas-placeholder" />
      <canvas className="fortune-sheet-canvas" ref={canvasRef} />
      <SheetOverlay />
    </div>
  );
};

export default Sheet;
