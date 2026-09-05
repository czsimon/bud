import type { ComponentProps, ReactNode } from "react";

function cx(...classes: Array<string | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

// Horizontal padding is a fixed choice rather than something callers restyle:
// `cx` only concatenates, so an override like `px-5` would ship alongside the
// default `px-3` and leave the winner up to stylesheet order.
type Pad = "cell" | "edge" | "none";

const HEAD_PAD: Record<Pad, string> = {
  cell: "px-3 py-2",
  edge: "px-5 py-2",
  none: "",
};

const CELL_PAD: Record<Pad, string> = {
  cell: "px-3 py-3",
  edge: "px-5 py-3",
  none: "",
};

export function DataTableViewport({
  className,
  ...props
}: ComponentProps<"div">) {
  return (
    <div className={cx("min-h-0 flex-1 overflow-auto", className)} {...props} />
  );
}

export function DataTable({ className, ...props }: ComponentProps<"table">) {
  return (
    <table className={cx("w-full text-left text-sm", className)} {...props} />
  );
}

type DataTableHeaderProps = Omit<ComponentProps<"thead">, "children"> & {
  children: ReactNode;
  rowClassName?: string;
};

export function DataTableHeader({
  children,
  className,
  rowClassName,
  ...props
}: DataTableHeaderProps) {
  return (
    <thead className={className} {...props}>
      <tr
        className={cx(
          "text-[11px] uppercase tracking-[0.14em] text-muted",
          rowClassName,
        )}
      >
        {children}
      </tr>
    </thead>
  );
}

export function DataTableHead({
  className,
  pad = "cell",
  scope = "col",
  ...props
}: ComponentProps<"th"> & { pad?: Pad }) {
  return (
    <th
      scope={scope}
      className={cx(HEAD_PAD[pad], "font-medium", className)}
      {...props}
    />
  );
}

export function DataTableBody(props: ComponentProps<"tbody">) {
  return <tbody {...props} />;
}

type DataTableRowProps = ComponentProps<"tr"> & {
  interactive?: boolean;
};

export function DataTableRow({
  className,
  interactive = false,
  ...props
}: DataTableRowProps) {
  return (
    <tr
      className={cx(
        "border-t border-rule/60",
        interactive && "cursor-pointer hover:bg-paper/70",
        className,
      )}
      {...props}
    />
  );
}

export function DataTableCell({
  className,
  pad = "cell",
  ...props
}: ComponentProps<"td"> & { pad?: Pad }) {
  return <td className={cx(CELL_PAD[pad], className)} {...props} />;
}

type DataTableEmptyRowProps = {
  colSpan: number;
  children: ReactNode;
  className?: string;
};

export function DataTableEmptyRow({
  colSpan,
  children,
  className,
}: DataTableEmptyRowProps) {
  return (
    <tr>
      <DataTableCell
        colSpan={colSpan}
        pad="none"
        className={cx("px-5 py-7 text-center text-sm text-muted", className)}
      >
        {children}
      </DataTableCell>
    </tr>
  );
}
