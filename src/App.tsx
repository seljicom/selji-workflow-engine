import React from 'react';
import {
  AppBar,
  Box,
  Container,
  Tab,
  Tabs,
  Toolbar,
  Typography
} from '@mui/material';

import WorkflowIcon from '@mui/icons-material/Hub';
import BuildIcon from '@mui/icons-material/Build';
import ApiIcon from '@mui/icons-material/CloudSync';
import SettingsIcon from '@mui/icons-material/Settings';
import HealthAndSafetyIcon from '@mui/icons-material/HealthAndSafety';
import ListAltIcon from '@mui/icons-material/ListAlt';
import SecurityIcon from '@mui/icons-material/Security';

import AsinAaidExtractor from './components/AsinAaidExtractor';
import PaApiExecutor from './components/PaApiExecutor';
import PaApiTestPanel from './components/PaApiTestPanel';
import SettingsManager from './components/SettingsManager';
import SystemHealth from './components/SystemHealth';
import LogViewer from './components/LogViewer';
import SecretsManager from './components/SecretsManager';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`workflow-tabpanel-${index}`}
      aria-labelledby={`workflow-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

function a11yProps(index: number) {
  return {
    id: `workflow-tab-${index}`,
    'aria-controls': `workflow-tabpanel-${index}`
  };
}

const App: React.FC = () => {
  const [value, setValue] = React.useState(0);

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" color="default" elevation={1}>
        <Toolbar>
          <WorkflowIcon sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            SELJI Workflow Engine
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="xl" sx={{ mt: 4, mb: 6 }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
          <Tabs
            value={value}
            onChange={handleChange}
            aria-label="SELJI workflow tabs"
            variant="scrollable"
            scrollButtons="auto"
          >
            <Tab
              label="ASIN & AAID Extractor"
              icon={<BuildIcon />}
              iconPosition="start"
              {...a11yProps(0)}
            />
            <Tab
              label="PA API Executor"
              icon={<ApiIcon />}
              iconPosition="start"
              {...a11yProps(1)}
            />
            <Tab
              label="PA API Tester"
              icon={<ApiIcon />}
              iconPosition="start"
              {...a11yProps(2)}
            />
            <Tab
              label="Settings"
              icon={<SettingsIcon />}
              iconPosition="start"
              {...a11yProps(3)}
            />
            <Tab
              label="System Health"
              icon={<HealthAndSafetyIcon />}
              iconPosition="start"
              {...a11yProps(4)}
            />
            <Tab
              label="Logs"
              icon={<ListAltIcon />}
              iconPosition="start"
              {...a11yProps(5)}
            />
            <Tab
              label="Secrets"
              icon={<SecurityIcon />}
              iconPosition="start"
              {...a11yProps(6)}
            />
          </Tabs>
        </Box>

        <TabPanel value={value} index={0}>
          <AsinAaidExtractor />
        </TabPanel>
        <TabPanel value={value} index={1}>
          <PaApiExecutor />
        </TabPanel>
        <TabPanel value={value} index={2}>
          <PaApiTestPanel />
        </TabPanel>
        <TabPanel value={value} index={3}>
          <SettingsManager />
        </TabPanel>
        <TabPanel value={value} index={4}>
          <SystemHealth />
        </TabPanel>
        <TabPanel value={value} index={5}>
          <LogViewer />
        </TabPanel>
        <TabPanel value={value} index={6}>
          <SecretsManager />
        </TabPanel>
      </Container>
    </Box>
  );
};

export default App;
