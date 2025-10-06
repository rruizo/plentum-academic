
import * as React from "react"
import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"

const ResponsiveTable = React.forwardRef<
  HTMLTableElement,
  React.HTMLAttributes<HTMLTableElement>
>(({ className, children, ...props }, ref) => {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return (
      <div className="space-y-4">
        {children}
      </div>
    );
  }
  
  return (
    <div className="relative w-full overflow-auto">
      <table
        ref={ref}
        className={cn("w-full caption-bottom text-sm", className)}
        {...props}
      >
        {children}
      </table>
    </div>
  );
});
ResponsiveTable.displayName = "ResponsiveTable"

const ResponsiveTableHeader = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, children, ...props }, ref) => {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return null; // Hide headers on mobile
  }
  
  return (
    <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props}>
      {children}
    </thead>
  );
});
ResponsiveTableHeader.displayName = "ResponsiveTableHeader"

const ResponsiveTableBody = React.forwardRef<
  HTMLTableSectionElement,
  React.HTMLAttributes<HTMLTableSectionElement>
>(({ className, children, ...props }, ref) => {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return <div className="space-y-4">{children}</div>;
  }
  
  return (
    <tbody
      ref={ref}
      className={cn("[&_tr:last-child]:border-0", className)}
      {...props}
    >
      {children}
    </tbody>
  );
});
ResponsiveTableBody.displayName = "ResponsiveTableBody"

const ResponsiveTableRow = React.forwardRef<
  HTMLTableRowElement,
  React.HTMLAttributes<HTMLTableRowElement> & {
    mobileLayout?: React.ReactNode;
  }
>(({ className, children, mobileLayout, ...props }, ref) => {
  const isMobile = useIsMobile();
  
  if (isMobile && mobileLayout) {
    return (
      <div className="bg-white border rounded-lg p-4 shadow-sm">
        {mobileLayout}
      </div>
    );
  }
  
  if (isMobile) {
    // Default mobile layout - convert table cells to card format
    return (
      <div className="bg-white border rounded-lg p-4 shadow-sm space-y-2">
        {children}
      </div>
    );
  }
  
  return (
    <tr
      ref={ref}
      className={cn(
        "border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted",
        className
      )}
      {...props}
    >
      {children}
    </tr>
  );
});
ResponsiveTableRow.displayName = "ResponsiveTableRow"

const ResponsiveTableCell = React.forwardRef<
  HTMLTableCellElement,
  React.TdHTMLAttributes<HTMLTableCellElement> & {
    label?: string;
  }
>(({ className, children, label, ...props }, ref) => {
  const isMobile = useIsMobile();
  
  if (isMobile) {
    return (
      <div className="flex justify-between items-center py-1">
        {label && (
          <span className="text-sm font-medium text-gray-600">{label}:</span>
        )}
        <div className="text-sm text-gray-900">{children}</div>
      </div>
    );
  }
  
  return (
    <td
      ref={ref}
      className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)}
      {...props}
    >
      {children}
    </td>
  );
});
ResponsiveTableCell.displayName = "ResponsiveTableCell"

const ResponsiveTableHead = React.forwardRef<
  HTMLTableCellElement,
  React.ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0",
      className
    )}
    {...props}
  />
))
ResponsiveTableHead.displayName = "ResponsiveTableHead"

export {
  ResponsiveTable,
  ResponsiveTableHeader,
  ResponsiveTableBody,
  ResponsiveTableRow,
  ResponsiveTableCell,
  ResponsiveTableHead,
}
