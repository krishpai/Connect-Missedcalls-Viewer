import React, { useMemo, useState } from "react";

import {
  DataGridPro,
  GridFooterContainer,
  GridColumnMenu,
  type GridColDef,
  type GridRowSelectionModel,
  type GridColumnMenuProps,
  type GridColumnVisibilityModel,
} from '@mui/x-data-grid-pro';

import {
  Tooltip,
  IconButton,
  Box,
} from '@mui/material';


import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PhoneIcon from '@mui/icons-material/Phone';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

const isIframe = window.self !== window.top;

// --- Interfaces ---
interface SearchResultsViewProps {
  searchResult: string | null;
  entraAuth: boolean;

  onDialNumberClicked: (value: string, contactid: string) => void;
}

interface MatchedObject {
  contact_id: string;
  customer_number: string;
  queue_name: string;
  initiation_timestamp: string;
  system_number: string;
  queue_id: string;
  language: string;
  handled_by_name: string;
}

interface GridRow extends MatchedObject {
  id: string;

}

/**
 * CUSTOM FOOTER PROPS INTERFACE
 * We explicitly define the types for the props we pass through slotProps.
 */
interface CustomFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  contactId?: string | null;
  count?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (event: React.MouseEvent<HTMLButtonElement> | null, newPage: number) => void;
  onPageSizeChange?: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
}

// --- Sub-Components ---

const CustomFooter = (props: CustomFooterProps) => {
  const {
    contactId,
    ...other
  } = props;

  const [copied, setCopied] = useState(false);

  const handleCopyContactId = async () => {
    if (!contactId) return;
    try {
      await navigator.clipboard.writeText(contactId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) { console.error("Copy failed", err); }
  };

  return (
    <GridFooterContainer {...other} sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      minHeight: '52px !important',
      paddingY: 0
    }}>
      <Box sx={{ pl: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ fontSize: '0.875rem', color: '#666', fontWeight: 500, lineHeight: 1 }}>
          {contactId ? `Selected Contact ID: ${contactId}` : ''}
        </Box>
        {contactId && (
          <Tooltip title={copied ? "Copied!" : "Copy Contact ID"}>
            <IconButton size="small" onClick={handleCopyContactId}>
              {copied ? <CheckCircleIcon fontSize="small" color="success" /> : <ContentCopyIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        )}
      </Box>

    </GridFooterContainer>
  );
};

const CustomColumnMenu = (props: GridColumnMenuProps) => (
  <GridColumnMenu
    {...props}
    slots={{
      columnMenuHideColumnItem: null,
      columnMenuManageColumnsItem: null,
      columnMenuColumnsItem: null
    }}
  />
);

const NoRowsOverlay = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'gray' }}>
    No matching recordings found.
  </Box>
);

// --- Main Component ---

export const SearchResultsView: React.FC<SearchResultsViewProps> = ({ searchResult, onDialNumberClicked }) => {

  const [columnVisibilityModel, setColumnVisibilityModel] = useState<GridColumnVisibilityModel>({ id: false });
  const [rowSelectionModel, setRowSelectionModel] = useState<GridRowSelectionModel>({ type: 'include', ids: new Set() });


  const gridRows = useMemo<GridRow[]>(() => {
    if (!searchResult) return [];
    try {
      const data = JSON.parse(searchResult);
      const rawData: Record<string, MatchedObject> = data || {};
      return Object.values(rawData).map((details) => ({
        ...details,
        id: details.contact_id,
      }));

    } catch (e) { console.log(e); return []; }
  }, [searchResult]);

  const selectedContactId = useMemo(() => {
    const selectionIds = rowSelectionModel.ids;
    if (!selectionIds || selectionIds.size === 0 || selectionIds.size > 1) return null;
    const firstId = selectionIds.values().next().value as string;
    return gridRows.find((row) => row.id === firstId)?.contact_id || null;
  }, [rowSelectionModel, gridRows]);


  const columns = useMemo<GridColDef<GridRow>[]>(() => {
    const baseColumns: GridColDef<GridRow>[] = [
      { field: 'id', filterable: false, headerName: 'Contact ID', width: 120, align: 'center', getApplyQuickFilterFn: () => null },
      { field: 'initiation_timestamp', headerName: 'Date', headerAlign: 'center', width: 220, align: 'center', valueFormatter: (value) => value ? new Date((value as string).slice(0, 19)).toLocaleString() : '' },
      { field: 'queue_name', headerName: 'Queue', headerAlign: 'center', width: 210, align: 'center' },
      { field: 'customer_number', headerName: 'Caller number', headerAlign: 'center', width: 130, align: 'center' },
      { field: 'system_number', headerName: 'Dialed number', headerAlign: 'center', width: 130, align: 'center' },
      { field: 'language', headerName: 'Language', headerAlign: 'center', width: 100, align: 'center' },
      { field: 'handled_by_name', headerName: 'Handled by', headerAlign: 'center', width: 200, align: 'center' },

      {
        field: 'dial_action', headerName: 'Call back', sortable: false, width: 90, align: 'center', getApplyQuickFilterFn: () => null, renderCell: (params) => (
          <IconButton color="primary" onClick={() => onDialNumberClicked(params.row.customer_number, params.row.contact_id)}><PhoneIcon /></IconButton>
        )
      }
    ];
    return baseColumns.filter(col => isIframe || col.field !== 'dial_action');
  }, [onDialNumberClicked]);

  if (!searchResult) return <Box sx={{ p: 5, textAlign: 'center' }}>No search performed.</Box>;

  return (
    <Box sx={{ height: 600, width: '100%', pt: 2 }}>
      <DataGridPro
        disableColumnMenu
        disableColumnSelector
        pagination
        showToolbar
        rows={gridRows}
        columns={columns}
        columnVisibilityModel={columnVisibilityModel}
        onColumnVisibilityModelChange={setColumnVisibilityModel}
        rowSelectionModel={rowSelectionModel}
        onRowSelectionModelChange={setRowSelectionModel}
        hideFooterSelectedRowCount
        slots={{
          columnMenu: CustomColumnMenu,
          footer: CustomFooter,
          noRowsOverlay: NoRowsOverlay,
        }}
        slotProps={{
          footer: {
            contactId: selectedContactId,
            count: gridRows.length,
          } as CustomFooterProps, // Use our defined interface instead of 'any'
          toolbar: {
            showQuickFilter: true,

            printOptions: { disableToolbarButton: true },
            style: { backgroundColor: '#e0e0e0' },
          }
        }}
        sx={{
          '& .MuiDataGrid-columnHeader': { backgroundColor: '#2e2c2c33 !important', color: 'black !important' },
          '& .MuiDataGrid-columnHeaderTitle': { fontWeight: 'bold' },
          '& .MuiDataGrid-toolbarContainer': {
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#424242 !important',
          },
        }}
      />
    </Box>
  );
};