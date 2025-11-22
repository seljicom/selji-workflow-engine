import React from 'react';
import { AppBar, Box, Container, Tab, Tabs, Toolbar, Typography } from '@mui/material';
import WorkflowIcon from '@mui/icons-material/Hub';
import BuildIcon from '@mui/icons-material/Build';
import AsinAaidExtractor from './components/AsinAaidExtractor';
import { APP_VERSION } from './version';

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
      {value === index && (
        <Box sx={{ py: 3 }}>
          {children}
        </Box>
      )}
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
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            SELJI Workflow Engine v{APP_VERSION}
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            
          </Typography>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 4, mb: 6 }}>
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
              label="Future Workflow"
              icon={<WorkflowIcon />}
              iconPosition="start"
              disabled
              {...a11yProps(1)}
            />
          </Tabs>
        </Box>

        <TabPanel value={value} index={0}>
          <AsinAaidExtractor />
        </TabPanel>

        <TabPanel value={value} index={1}>
          <Typography variant="h6" gutterBottom>
            Coming soon
          </Typography>
          <Typography variant="body2" color="text.secondary">
            This tab is reserved for the next SELJI workflow module. The core layout, theming, and
            state management are already wired so we can drop new tools here with minimal friction.
          </Typography>
        </TabPanel>
      </Container>
    </Box>
  );
};

export default App;