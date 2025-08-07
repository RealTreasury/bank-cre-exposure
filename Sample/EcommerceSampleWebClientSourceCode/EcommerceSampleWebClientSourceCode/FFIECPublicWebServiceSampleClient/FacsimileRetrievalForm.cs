using System;
using System.Drawing;
using System.Collections;
using System.Collections.Specialized;
using System.ComponentModel;
using System.Windows.Forms;
using System.Data;
using System.IO;
using System.Web.Services.Protocols;
using System.Xml;
using System.Timers;
//TEST

using System.Reflection;

//using Microsoft.Web.Services3;
using Microsoft.Web.Services3.Security;
using Microsoft.Web.Services3.Security.Tokens;

namespace FFIECPublicWebServiceSampleClient
{
	/// <summary>
	/// Summary description for Form1.
	/// </summary>
	public class Form1 : System.Windows.Forms.Form
	{
		private System.Windows.Forms.GroupBox groupUser;
		private System.Windows.Forms.Label UserIDLabel;
		private System.Windows.Forms.Label UserSecTokenLabel;
		private System.Windows.Forms.Button TestUserAccess;
		private System.Windows.Forms.TextBox UserSecurityToken;
		private System.Windows.Forms.TextBox UserID;
		private System.Windows.Forms.Label SaveFolderLabel;
		private System.Windows.Forms.TextBox SaveFolderName;
		private System.Windows.Forms.Button BrowseFolderSelect;
		private System.Windows.Forms.FolderBrowserDialog SaveFolderBrowserDialog;
		private System.Windows.Forms.GroupBox groupSaveFolder;
		private System.Windows.Forms.GroupBox groupRetrieveFacsimiles;
		private System.Windows.Forms.Button ClearFolderSelect;
		private System.Windows.Forms.Button GetFacsimileButton;
		private System.Windows.Forms.ComboBox RetrieveMethod;
		private System.Windows.Forms.ComboBox FacsimileReportingCycleEndDate;
		private System.Windows.Forms.Label FacsimileReportingCycleEndDateLabel;
		private System.Windows.Forms.Label ReporterIDLabel;
		private System.Windows.Forms.TextBox ReporterID;
		private System.Windows.Forms.ComboBox FacsimileFormat;
		private System.Windows.Forms.Label RetrieveFacsimileByLabel;
		private System.Windows.Forms.GroupBox groupRetrieveReporters;
		private System.Windows.Forms.Button GetReportersButton;
		private System.Windows.Forms.ComboBox PORReportingCycleEndDate;
		private System.Windows.Forms.Label ReportersReportingCycleEndDateLabel;
		private System.Windows.Forms.RichTextBox LogPane;
		private System.Windows.Forms.Label TitleLabel;
		private System.Windows.Forms.GroupBox groupLog;
		private System.Windows.Forms.Label FacsimileFormatLabel;
		private System.Windows.Forms.TextBox FiledSinceDate;
		private System.Windows.Forms.Label FiledSinceDateLabel;
		private System.Windows.Forms.GroupBox groupFilersSinceDate;
		private System.Windows.Forms.Button GetFilersButton;
		private System.Windows.Forms.Label FilersReportingCycleEndDateLabel;
		private System.Windows.Forms.ComboBox FilersReportingCycleEndDate;

		private const string RETRIEVE_METHOD_BY_RSSD = "ID RSSD";
		private const string RETRIEVE_METHOD_BY_FDIC_CERT = "FDIC Certificate Number";
		private const string RETRIEVE_METHOD_BY_OCC_CHART = "OCC Charter Number";
		private const string RETRIEVE_METHOD_BY_OTS_DOCK = "OTS Docket Number";
        
        private Button ClearLogButton;
        private GroupBox groupRetrieveReportingPeriods;
        private Button GetReportingPeriodsButton;
        private Button GetUBPRReportingPeriodsButton;
        private GroupBox groupRetrieveUbprFacsimiles;
        private ComboBox UBPRRetrieveMethod;
        private ComboBox UBPRFacsimileReportingCycleEndDate;
        private Label UBPRFacsimileReportingCycleEndDateLabel;
        private Label UBPRReporterIDLabel;
        private TextBox UBPRFIID;
        private Label UBPRFacsimileFormatLabel;
        private Label RetrieveUBPRFacsimileByLabel;
        private Button GetUBPRFacsimileButton;
        private Label XBRLFormatLabel;
        private GroupBox groupBox1;
        private GroupBox groupBox2;
        private Label label1;
        private Label label2;
        private ComboBox FilersReportingDateTimeEndDate;
        private Button GetFilersDateTimeButton;
        private TextBox FiledSinceDateTime;		
		/// <summary>
		/// Required designer variable.
		/// </summary>
		private System.ComponentModel.Container components = null;

		public Form1()
		{
			//
			// Required for Windows Form Designer support
			//
			InitializeComponent();	
			
			this.RetrieveMethod.Items.AddRange(new object[] {RETRIEVE_METHOD_BY_RSSD, 
				RETRIEVE_METHOD_BY_FDIC_CERT, RETRIEVE_METHOD_BY_OCC_CHART, RETRIEVE_METHOD_BY_OTS_DOCK});
			this.RetrieveMethod.SelectedIndex = 0;

			this.FacsimileFormat.Items.AddRange(new object[] {"PDF", "XBRL", "SDF"});
			this.FacsimileFormat.SelectedIndex = 0;

			//this.FiledSinceDate.Validating += new CancelEventHandler(FiledSinceDate_Validating);

            this.UBPRRetrieveMethod.Items.AddRange(new object[] {RETRIEVE_METHOD_BY_RSSD, 
                RETRIEVE_METHOD_BY_FDIC_CERT, RETRIEVE_METHOD_BY_OCC_CHART, RETRIEVE_METHOD_BY_OTS_DOCK});
            this.UBPRRetrieveMethod.SelectedIndex = 0;
 
		}

		/// <summary>
		/// Clean up any resources being used.
		/// </summary>
		protected override void Dispose( bool disposing )
		{
			if( disposing )
			{
				if (components != null) 
				{
					components.Dispose();
				}
			}
			base.Dispose( disposing );
		}

		#region Windows Form Designer generated code
		/// <summary>
		/// Required method for Designer support - do not modify
		/// the contents of this method with the code editor.
		/// </summary>
		private void InitializeComponent()
		{
            this.GetFacsimileButton = new System.Windows.Forms.Button();
            this.groupUser = new System.Windows.Forms.GroupBox();
            this.TestUserAccess = new System.Windows.Forms.Button();
            this.UserSecurityToken = new System.Windows.Forms.TextBox();
            this.UserID = new System.Windows.Forms.TextBox();
            this.UserSecTokenLabel = new System.Windows.Forms.Label();
            this.UserIDLabel = new System.Windows.Forms.Label();
            this.groupSaveFolder = new System.Windows.Forms.GroupBox();
            this.ClearFolderSelect = new System.Windows.Forms.Button();
            this.SaveFolderLabel = new System.Windows.Forms.Label();
            this.BrowseFolderSelect = new System.Windows.Forms.Button();
            this.SaveFolderName = new System.Windows.Forms.TextBox();
            this.SaveFolderBrowserDialog = new System.Windows.Forms.FolderBrowserDialog();
            this.groupRetrieveFacsimiles = new System.Windows.Forms.GroupBox();
            this.RetrieveMethod = new System.Windows.Forms.ComboBox();
            this.FacsimileReportingCycleEndDate = new System.Windows.Forms.ComboBox();
            this.FacsimileReportingCycleEndDateLabel = new System.Windows.Forms.Label();
            this.ReporterIDLabel = new System.Windows.Forms.Label();
            this.ReporterID = new System.Windows.Forms.TextBox();
            this.FacsimileFormat = new System.Windows.Forms.ComboBox();
            this.FacsimileFormatLabel = new System.Windows.Forms.Label();
            this.RetrieveFacsimileByLabel = new System.Windows.Forms.Label();
            this.groupRetrieveReporters = new System.Windows.Forms.GroupBox();
            this.GetReportersButton = new System.Windows.Forms.Button();
            this.PORReportingCycleEndDate = new System.Windows.Forms.ComboBox();
            this.ReportersReportingCycleEndDateLabel = new System.Windows.Forms.Label();
            this.FiledSinceDate = new System.Windows.Forms.TextBox();
            this.FiledSinceDateLabel = new System.Windows.Forms.Label();
            this.LogPane = new System.Windows.Forms.RichTextBox();
            this.TitleLabel = new System.Windows.Forms.Label();
            this.groupLog = new System.Windows.Forms.GroupBox();
            this.ClearLogButton = new System.Windows.Forms.Button();
            this.groupFilersSinceDate = new System.Windows.Forms.GroupBox();
            this.GetFilersButton = new System.Windows.Forms.Button();
            this.FilersReportingCycleEndDate = new System.Windows.Forms.ComboBox();
            this.FilersReportingCycleEndDateLabel = new System.Windows.Forms.Label();
            this.groupRetrieveReportingPeriods = new System.Windows.Forms.GroupBox();
            this.GetUBPRReportingPeriodsButton = new System.Windows.Forms.Button();
            this.GetReportingPeriodsButton = new System.Windows.Forms.Button();
            this.groupRetrieveUbprFacsimiles = new System.Windows.Forms.GroupBox();
            this.XBRLFormatLabel = new System.Windows.Forms.Label();
            this.UBPRRetrieveMethod = new System.Windows.Forms.ComboBox();
            this.UBPRFacsimileReportingCycleEndDate = new System.Windows.Forms.ComboBox();
            this.UBPRFacsimileReportingCycleEndDateLabel = new System.Windows.Forms.Label();
            this.UBPRReporterIDLabel = new System.Windows.Forms.Label();
            this.UBPRFIID = new System.Windows.Forms.TextBox();
            this.UBPRFacsimileFormatLabel = new System.Windows.Forms.Label();
            this.RetrieveUBPRFacsimileByLabel = new System.Windows.Forms.Label();
            this.GetUBPRFacsimileButton = new System.Windows.Forms.Button();
            this.groupBox1 = new System.Windows.Forms.GroupBox();
            this.groupBox2 = new System.Windows.Forms.GroupBox();
            this.GetFilersDateTimeButton = new System.Windows.Forms.Button();
            this.FiledSinceDateTime = new System.Windows.Forms.TextBox();
            this.FilersReportingDateTimeEndDate = new System.Windows.Forms.ComboBox();
            this.label2 = new System.Windows.Forms.Label();
            this.label1 = new System.Windows.Forms.Label();
            this.groupUser.SuspendLayout();
            this.groupSaveFolder.SuspendLayout();
            this.groupRetrieveFacsimiles.SuspendLayout();
            this.groupRetrieveReporters.SuspendLayout();
            this.groupLog.SuspendLayout();
            this.groupFilersSinceDate.SuspendLayout();
            this.groupRetrieveReportingPeriods.SuspendLayout();
            this.groupRetrieveUbprFacsimiles.SuspendLayout();
            this.groupBox2.SuspendLayout();
            this.SuspendLayout();
            // 
            // GetFacsimileButton
            // 
            this.GetFacsimileButton.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.GetFacsimileButton.Location = new System.Drawing.Point(471, 13);
            this.GetFacsimileButton.Name = "GetFacsimileButton";
            this.GetFacsimileButton.Size = new System.Drawing.Size(127, 24);
            this.GetFacsimileButton.TabIndex = 0;
            this.GetFacsimileButton.Text = "Get Call Facsimile";
            this.GetFacsimileButton.Click += new System.EventHandler(this.GetFacsimileButton_Click);
            // 
            // groupUser
            // 
            this.groupUser.Anchor = ((System.Windows.Forms.AnchorStyles)(((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.groupUser.Controls.Add(this.TestUserAccess);
            this.groupUser.Controls.Add(this.UserSecurityToken);
            this.groupUser.Controls.Add(this.UserID);
            this.groupUser.Controls.Add(this.UserSecTokenLabel);
            this.groupUser.Controls.Add(this.UserIDLabel);
            this.groupUser.Location = new System.Drawing.Point(7, 26);
            this.groupUser.Name = "groupUser";
            this.groupUser.Size = new System.Drawing.Size(607, 42);
            this.groupUser.TabIndex = 1;
            this.groupUser.TabStop = false;
            this.groupUser.Text = "User Credentials";
            // 
            // TestUserAccess
            // 
            this.TestUserAccess.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.TestUserAccess.Location = new System.Drawing.Point(487, 15);
            this.TestUserAccess.Name = "TestUserAccess";
            this.TestUserAccess.Size = new System.Drawing.Size(112, 24);
            this.TestUserAccess.TabIndex = 4;
            this.TestUserAccess.Text = "Test User Access";
            this.TestUserAccess.Click += new System.EventHandler(this.TestUserAccess_Click);
            // 
            // UserSecurityToken
            // 
            this.UserSecurityToken.Location = new System.Drawing.Point(354, 17);
            this.UserSecurityToken.Name = "UserSecurityToken";
            this.UserSecurityToken.Size = new System.Drawing.Size(168, 20);
            this.UserSecurityToken.TabIndex = 3;
            // 
            // UserID
            // 
            this.UserID.Location = new System.Drawing.Point(75, 18);
            this.UserID.Name = "UserID";
            this.UserID.Size = new System.Drawing.Size(168, 20);
            this.UserID.TabIndex = 2;
            // 
            // UserSecTokenLabel
            // 
            this.UserSecTokenLabel.Location = new System.Drawing.Point(269, 19);
            this.UserSecTokenLabel.Name = "UserSecTokenLabel";
            this.UserSecTokenLabel.RightToLeft = System.Windows.Forms.RightToLeft.No;
            this.UserSecTokenLabel.Size = new System.Drawing.Size(88, 16);
            this.UserSecTokenLabel.TabIndex = 1;
            this.UserSecTokenLabel.Text = "Security Token:";
            this.UserSecTokenLabel.TextAlign = System.Drawing.ContentAlignment.MiddleLeft;
            // 
            // UserIDLabel
            // 
            this.UserIDLabel.Location = new System.Drawing.Point(21, 19);
            this.UserIDLabel.Name = "UserIDLabel";
            this.UserIDLabel.RightToLeft = System.Windows.Forms.RightToLeft.No;
            this.UserIDLabel.Size = new System.Drawing.Size(48, 16);
            this.UserIDLabel.TabIndex = 0;
            this.UserIDLabel.Text = "User ID:";
            this.UserIDLabel.TextAlign = System.Drawing.ContentAlignment.MiddleLeft;
            // 
            // groupSaveFolder
            // 
            this.groupSaveFolder.Anchor = ((System.Windows.Forms.AnchorStyles)(((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.groupSaveFolder.Controls.Add(this.ClearFolderSelect);
            this.groupSaveFolder.Controls.Add(this.SaveFolderLabel);
            this.groupSaveFolder.Controls.Add(this.BrowseFolderSelect);
            this.groupSaveFolder.Controls.Add(this.SaveFolderName);
            this.groupSaveFolder.Location = new System.Drawing.Point(7, 72);
            this.groupSaveFolder.Name = "groupSaveFolder";
            this.groupSaveFolder.Size = new System.Drawing.Size(606, 46);
            this.groupSaveFolder.TabIndex = 2;
            this.groupSaveFolder.TabStop = false;
            this.groupSaveFolder.Text = "Folder to save retrieved facsimiles";
            // 
            // ClearFolderSelect
            // 
            this.ClearFolderSelect.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.ClearFolderSelect.Location = new System.Drawing.Point(519, 18);
            this.ClearFolderSelect.Name = "ClearFolderSelect";
            this.ClearFolderSelect.Size = new System.Drawing.Size(80, 23);
            this.ClearFolderSelect.TabIndex = 6;
            this.ClearFolderSelect.Text = "Clear Folder";
            this.ClearFolderSelect.Click += new System.EventHandler(this.ClearFolderSelect_Click);
            // 
            // SaveFolderLabel
            // 
            this.SaveFolderLabel.Location = new System.Drawing.Point(16, 20);
            this.SaveFolderLabel.Name = "SaveFolderLabel";
            this.SaveFolderLabel.Size = new System.Drawing.Size(46, 16);
            this.SaveFolderLabel.TabIndex = 3;
            this.SaveFolderLabel.Text = "Folder:";
            this.SaveFolderLabel.TextAlign = System.Drawing.ContentAlignment.MiddleLeft;
            // 
            // BrowseFolderSelect
            // 
            this.BrowseFolderSelect.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.BrowseFolderSelect.Location = new System.Drawing.Point(430, 18);
            this.BrowseFolderSelect.Name = "BrowseFolderSelect";
            this.BrowseFolderSelect.Size = new System.Drawing.Size(72, 24);
            this.BrowseFolderSelect.TabIndex = 5;
            this.BrowseFolderSelect.Text = "Browse";
            this.BrowseFolderSelect.Click += new System.EventHandler(this.BrowseFolderSelect_Click);
            // 
            // SaveFolderName
            // 
            this.SaveFolderName.Anchor = ((System.Windows.Forms.AnchorStyles)(((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.SaveFolderName.Location = new System.Drawing.Point(68, 18);
            this.SaveFolderName.Name = "SaveFolderName";
            this.SaveFolderName.Size = new System.Drawing.Size(346, 20);
            this.SaveFolderName.TabIndex = 4;
            // 
            // groupRetrieveFacsimiles
            // 
            this.groupRetrieveFacsimiles.Anchor = ((System.Windows.Forms.AnchorStyles)(((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.groupRetrieveFacsimiles.Controls.Add(this.RetrieveMethod);
            this.groupRetrieveFacsimiles.Controls.Add(this.FacsimileReportingCycleEndDate);
            this.groupRetrieveFacsimiles.Controls.Add(this.FacsimileReportingCycleEndDateLabel);
            this.groupRetrieveFacsimiles.Controls.Add(this.ReporterIDLabel);
            this.groupRetrieveFacsimiles.Controls.Add(this.ReporterID);
            this.groupRetrieveFacsimiles.Controls.Add(this.FacsimileFormat);
            this.groupRetrieveFacsimiles.Controls.Add(this.FacsimileFormatLabel);
            this.groupRetrieveFacsimiles.Controls.Add(this.RetrieveFacsimileByLabel);
            this.groupRetrieveFacsimiles.Controls.Add(this.GetFacsimileButton);
            this.groupRetrieveFacsimiles.Location = new System.Drawing.Point(7, 167);
            this.groupRetrieveFacsimiles.Name = "groupRetrieveFacsimiles";
            this.groupRetrieveFacsimiles.Size = new System.Drawing.Size(607, 65);
            this.groupRetrieveFacsimiles.TabIndex = 3;
            this.groupRetrieveFacsimiles.TabStop = false;
            this.groupRetrieveFacsimiles.Text = "Retrieve Call Report Facsimile";
            // 
            // RetrieveMethod
            // 
            this.RetrieveMethod.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList;
            this.RetrieveMethod.Location = new System.Drawing.Point(181, 38);
            this.RetrieveMethod.Name = "RetrieveMethod";
            this.RetrieveMethod.Size = new System.Drawing.Size(152, 21);
            this.RetrieveMethod.TabIndex = 7;
            this.RetrieveMethod.SelectedIndexChanged += new System.EventHandler(this.RetrieveMethod_SelectedIndexChanged);
            // 
            // FacsimileReportingCycleEndDate
            // 
            this.FacsimileReportingCycleEndDate.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList;
            this.FacsimileReportingCycleEndDate.Location = new System.Drawing.Point(180, 12);
            this.FacsimileReportingCycleEndDate.Name = "FacsimileReportingCycleEndDate";
            this.FacsimileReportingCycleEndDate.Size = new System.Drawing.Size(153, 21);
            this.FacsimileReportingCycleEndDate.TabIndex = 6;
            // 
            // FacsimileReportingCycleEndDateLabel
            // 
            this.FacsimileReportingCycleEndDateLabel.Location = new System.Drawing.Point(20, 15);
            this.FacsimileReportingCycleEndDateLabel.Name = "FacsimileReportingCycleEndDateLabel";
            this.FacsimileReportingCycleEndDateLabel.Size = new System.Drawing.Size(144, 16);
            this.FacsimileReportingCycleEndDateLabel.TabIndex = 5;
            this.FacsimileReportingCycleEndDateLabel.Text = "Reporting Period End Date:";
            this.FacsimileReportingCycleEndDateLabel.TextAlign = System.Drawing.ContentAlignment.MiddleLeft;
            // 
            // ReporterIDLabel
            // 
            this.ReporterIDLabel.Location = new System.Drawing.Point(322, 37);
            this.ReporterIDLabel.Name = "ReporterIDLabel";
            this.ReporterIDLabel.Size = new System.Drawing.Size(134, 23);
            this.ReporterIDLabel.TabIndex = 4;
            this.ReporterIDLabel.Text = "ID RSSD:";
            this.ReporterIDLabel.TextAlign = System.Drawing.ContentAlignment.MiddleRight;
            // 
            // ReporterID
            // 
            this.ReporterID.Location = new System.Drawing.Point(460, 39);
            this.ReporterID.Name = "ReporterID";
            this.ReporterID.Size = new System.Drawing.Size(128, 20);
            this.ReporterID.TabIndex = 3;
            // 
            // FacsimileFormat
            // 
            this.FacsimileFormat.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList;
            this.FacsimileFormat.Location = new System.Drawing.Point(459, 13);
            this.FacsimileFormat.Name = "FacsimileFormat";
            this.FacsimileFormat.Size = new System.Drawing.Size(128, 21);
            this.FacsimileFormat.TabIndex = 2;
            // 
            // FacsimileFormatLabel
            // 
            this.FacsimileFormatLabel.Location = new System.Drawing.Point(358, 12);
            this.FacsimileFormatLabel.Name = "FacsimileFormatLabel";
            this.FacsimileFormatLabel.Size = new System.Drawing.Size(98, 23);
            this.FacsimileFormatLabel.TabIndex = 1;
            this.FacsimileFormatLabel.Text = "Facsimile Format:";
            this.FacsimileFormatLabel.TextAlign = System.Drawing.ContentAlignment.MiddleRight;
            // 
            // RetrieveFacsimileByLabel
            // 
            this.RetrieveFacsimileByLabel.Location = new System.Drawing.Point(20, 36);
            this.RetrieveFacsimileByLabel.Name = "RetrieveFacsimileByLabel";
            this.RetrieveFacsimileByLabel.Size = new System.Drawing.Size(144, 24);
            this.RetrieveFacsimileByLabel.TabIndex = 0;
            this.RetrieveFacsimileByLabel.Text = "Retrieve Call Facsimile By:";
            this.RetrieveFacsimileByLabel.TextAlign = System.Drawing.ContentAlignment.MiddleLeft;
            // 
            // groupRetrieveReporters
            // 
            this.groupRetrieveReporters.Anchor = ((System.Windows.Forms.AnchorStyles)(((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.groupRetrieveReporters.Controls.Add(this.GetReportersButton);
            this.groupRetrieveReporters.Controls.Add(this.PORReportingCycleEndDate);
            this.groupRetrieveReporters.Controls.Add(this.ReportersReportingCycleEndDateLabel);
            this.groupRetrieveReporters.Location = new System.Drawing.Point(7, 238);
            this.groupRetrieveReporters.Name = "groupRetrieveReporters";
            this.groupRetrieveReporters.Size = new System.Drawing.Size(607, 44);
            this.groupRetrieveReporters.TabIndex = 4;
            this.groupRetrieveReporters.TabStop = false;
            this.groupRetrieveReporters.Text = "Retrieve Call Report Panel Of Reporters";
            // 
            // GetReportersButton
            // 
            this.GetReportersButton.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.GetReportersButton.Location = new System.Drawing.Point(471, 12);
            this.GetReportersButton.Name = "GetReportersButton";
            this.GetReportersButton.Size = new System.Drawing.Size(127, 24);
            this.GetReportersButton.TabIndex = 10;
            this.GetReportersButton.Text = "Get POR";
            this.GetReportersButton.Click += new System.EventHandler(this.GetReportersButton_Click);
            // 
            // PORReportingCycleEndDate
            // 
            this.PORReportingCycleEndDate.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList;
            this.PORReportingCycleEndDate.Location = new System.Drawing.Point(181, 15);
            this.PORReportingCycleEndDate.Name = "PORReportingCycleEndDate";
            this.PORReportingCycleEndDate.Size = new System.Drawing.Size(152, 21);
            this.PORReportingCycleEndDate.TabIndex = 7;
            // 
            // ReportersReportingCycleEndDateLabel
            // 
            this.ReportersReportingCycleEndDateLabel.Location = new System.Drawing.Point(23, 16);
            this.ReportersReportingCycleEndDateLabel.Name = "ReportersReportingCycleEndDateLabel";
            this.ReportersReportingCycleEndDateLabel.Size = new System.Drawing.Size(152, 16);
            this.ReportersReportingCycleEndDateLabel.TabIndex = 6;
            this.ReportersReportingCycleEndDateLabel.Text = "Reporting Period End Date:";
            this.ReportersReportingCycleEndDateLabel.TextAlign = System.Drawing.ContentAlignment.MiddleLeft;
            // 
            // FiledSinceDate
            // 
            this.FiledSinceDate.Location = new System.Drawing.Point(447, 14);
            this.FiledSinceDate.Name = "FiledSinceDate";
            this.FiledSinceDate.Size = new System.Drawing.Size(128, 20);
            this.FiledSinceDate.TabIndex = 9;
            // 
            // FiledSinceDateLabel
            // 
            this.FiledSinceDateLabel.Location = new System.Drawing.Point(350, 15);
            this.FiledSinceDateLabel.Name = "FiledSinceDateLabel";
            this.FiledSinceDateLabel.Size = new System.Drawing.Size(93, 16);
            this.FiledSinceDateLabel.TabIndex = 8;
            this.FiledSinceDateLabel.Text = "Filed Since Date:";
            this.FiledSinceDateLabel.TextAlign = System.Drawing.ContentAlignment.MiddleRight;
            // 
            // LogPane
            // 
            this.LogPane.Dock = System.Windows.Forms.DockStyle.Top;
            this.LogPane.Location = new System.Drawing.Point(3, 16);
            this.LogPane.Name = "LogPane";
            this.LogPane.Size = new System.Drawing.Size(736, 69);
            this.LogPane.TabIndex = 5;
            this.LogPane.Text = "";
            // 
            // TitleLabel
            // 
            this.TitleLabel.Anchor = ((System.Windows.Forms.AnchorStyles)(((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.TitleLabel.Font = new System.Drawing.Font("Microsoft Sans Serif", 12F, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, ((byte)(0)));
            this.TitleLabel.Location = new System.Drawing.Point(7, 4);
            this.TitleLabel.Name = "TitleLabel";
            this.TitleLabel.Size = new System.Drawing.Size(598, 24);
            this.TitleLabel.TabIndex = 6;
            this.TitleLabel.Text = "FFIEC CDR Public Web Service Sample Client";
            this.TitleLabel.TextAlign = System.Drawing.ContentAlignment.MiddleCenter;
            // 
            // groupLog
            // 
            this.groupLog.Anchor = ((System.Windows.Forms.AnchorStyles)((((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Bottom) 
            | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.groupLog.AutoSize = true;
            this.groupLog.Controls.Add(this.LogPane);
            this.groupLog.Controls.Add(this.ClearLogButton);
            this.groupLog.Location = new System.Drawing.Point(12, 455);
            this.groupLog.Name = "groupLog";
            this.groupLog.Size = new System.Drawing.Size(742, 955);
            this.groupLog.TabIndex = 7;
            this.groupLog.TabStop = false;
            this.groupLog.Text = "Retrieval Log";
            // 
            // ClearLogButton
            // 
            this.ClearLogButton.Location = new System.Drawing.Point(656, 94);
            this.ClearLogButton.Name = "ClearLogButton";
            this.ClearLogButton.Size = new System.Drawing.Size(80, 23);
            this.ClearLogButton.TabIndex = 9;
            this.ClearLogButton.Text = "Clear Log";
            this.ClearLogButton.Click += new System.EventHandler(this.ClearLogButton_Click);
            // 
            // groupFilersSinceDate
            // 
            this.groupFilersSinceDate.Anchor = ((System.Windows.Forms.AnchorStyles)(((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.groupFilersSinceDate.Controls.Add(this.GetFilersButton);
            this.groupFilersSinceDate.Controls.Add(this.FilersReportingCycleEndDate);
            this.groupFilersSinceDate.Controls.Add(this.FilersReportingCycleEndDateLabel);
            this.groupFilersSinceDate.Controls.Add(this.FiledSinceDate);
            this.groupFilersSinceDate.Controls.Add(this.FiledSinceDateLabel);
            this.groupFilersSinceDate.Location = new System.Drawing.Point(8, 288);
            this.groupFilersSinceDate.Name = "groupFilersSinceDate";
            this.groupFilersSinceDate.Size = new System.Drawing.Size(607, 40);
            this.groupFilersSinceDate.TabIndex = 8;
            this.groupFilersSinceDate.TabStop = false;
            this.groupFilersSinceDate.Text = "Retrieve Call Report Filers Since Date";
            // 
            // GetFilersButton
            // 
            this.GetFilersButton.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.GetFilersButton.Location = new System.Drawing.Point(472, 12);
            this.GetFilersButton.Name = "GetFilersButton";
            this.GetFilersButton.Size = new System.Drawing.Size(128, 24);
            this.GetFilersButton.TabIndex = 10;
            this.GetFilersButton.Text = "Get Filers";
            this.GetFilersButton.Click += new System.EventHandler(this.GetFilersButton_Click);
            // 
            // FilersReportingCycleEndDate
            // 
            this.FilersReportingCycleEndDate.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList;
            this.FilersReportingCycleEndDate.Location = new System.Drawing.Point(180, 13);
            this.FilersReportingCycleEndDate.Name = "FilersReportingCycleEndDate";
            this.FilersReportingCycleEndDate.Size = new System.Drawing.Size(152, 21);
            this.FilersReportingCycleEndDate.TabIndex = 7;
            // 
            // FilersReportingCycleEndDateLabel
            // 
            this.FilersReportingCycleEndDateLabel.Location = new System.Drawing.Point(23, 16);
            this.FilersReportingCycleEndDateLabel.Name = "FilersReportingCycleEndDateLabel";
            this.FilersReportingCycleEndDateLabel.Size = new System.Drawing.Size(152, 16);
            this.FilersReportingCycleEndDateLabel.TabIndex = 6;
            this.FilersReportingCycleEndDateLabel.Text = "Reporting Period End Date:";
            this.FilersReportingCycleEndDateLabel.TextAlign = System.Drawing.ContentAlignment.MiddleLeft;
            // 
            // groupRetrieveReportingPeriods
            // 
            this.groupRetrieveReportingPeriods.Anchor = ((System.Windows.Forms.AnchorStyles)(((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.groupRetrieveReportingPeriods.Controls.Add(this.GetUBPRReportingPeriodsButton);
            this.groupRetrieveReportingPeriods.Controls.Add(this.GetReportingPeriodsButton);
            this.groupRetrieveReportingPeriods.Location = new System.Drawing.Point(9, 123);
            this.groupRetrieveReportingPeriods.Name = "groupRetrieveReportingPeriods";
            this.groupRetrieveReportingPeriods.Size = new System.Drawing.Size(607, 38);
            this.groupRetrieveReportingPeriods.TabIndex = 10;
            this.groupRetrieveReportingPeriods.TabStop = false;
            this.groupRetrieveReportingPeriods.Text = "Retrieve Available Reporting Periods";
            // 
            // GetUBPRReportingPeriodsButton
            // 
            this.GetUBPRReportingPeriodsButton.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.GetUBPRReportingPeriodsButton.Location = new System.Drawing.Point(429, 10);
            this.GetUBPRReportingPeriodsButton.Name = "GetUBPRReportingPeriodsButton";
            this.GetUBPRReportingPeriodsButton.Size = new System.Drawing.Size(168, 24);
            this.GetUBPRReportingPeriodsButton.TabIndex = 1;
            this.GetUBPRReportingPeriodsButton.Text = "Get UBPR Reporting Periods";
            this.GetUBPRReportingPeriodsButton.Click += new System.EventHandler(this.GetUBPRReportingPeriodsButton_Click);
            // 
            // GetReportingPeriodsButton
            // 
            this.GetReportingPeriodsButton.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.GetReportingPeriodsButton.Location = new System.Drawing.Point(244, 10);
            this.GetReportingPeriodsButton.Name = "GetReportingPeriodsButton";
            this.GetReportingPeriodsButton.Size = new System.Drawing.Size(168, 24);
            this.GetReportingPeriodsButton.TabIndex = 1;
            this.GetReportingPeriodsButton.Text = "Get Call Reporting Periods";
            this.GetReportingPeriodsButton.Click += new System.EventHandler(this.GetReportingPeriodsButton_Click);
            // 
            // groupRetrieveUbprFacsimiles
            // 
            this.groupRetrieveUbprFacsimiles.Anchor = ((System.Windows.Forms.AnchorStyles)(((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.groupRetrieveUbprFacsimiles.Controls.Add(this.XBRLFormatLabel);
            this.groupRetrieveUbprFacsimiles.Controls.Add(this.UBPRRetrieveMethod);
            this.groupRetrieveUbprFacsimiles.Controls.Add(this.UBPRFacsimileReportingCycleEndDate);
            this.groupRetrieveUbprFacsimiles.Controls.Add(this.UBPRFacsimileReportingCycleEndDateLabel);
            this.groupRetrieveUbprFacsimiles.Controls.Add(this.UBPRReporterIDLabel);
            this.groupRetrieveUbprFacsimiles.Controls.Add(this.UBPRFIID);
            this.groupRetrieveUbprFacsimiles.Controls.Add(this.UBPRFacsimileFormatLabel);
            this.groupRetrieveUbprFacsimiles.Controls.Add(this.RetrieveUBPRFacsimileByLabel);
            this.groupRetrieveUbprFacsimiles.Controls.Add(this.GetUBPRFacsimileButton);
            this.groupRetrieveUbprFacsimiles.Location = new System.Drawing.Point(9, 333);
            this.groupRetrieveUbprFacsimiles.Name = "groupRetrieveUbprFacsimiles";
            this.groupRetrieveUbprFacsimiles.Size = new System.Drawing.Size(607, 66);
            this.groupRetrieveUbprFacsimiles.TabIndex = 11;
            this.groupRetrieveUbprFacsimiles.TabStop = false;
            this.groupRetrieveUbprFacsimiles.Text = "Retrieve UBPR Facsimile";
            // 
            // XBRLFormatLabel
            // 
            this.XBRLFormatLabel.Location = new System.Drawing.Point(444, 9);
            this.XBRLFormatLabel.Name = "XBRLFormatLabel";
            this.XBRLFormatLabel.Size = new System.Drawing.Size(98, 23);
            this.XBRLFormatLabel.TabIndex = 8;
            this.XBRLFormatLabel.Text = "XBRL";
            this.XBRLFormatLabel.TextAlign = System.Drawing.ContentAlignment.MiddleLeft;
            // 
            // UBPRRetrieveMethod
            // 
            this.UBPRRetrieveMethod.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList;
            this.UBPRRetrieveMethod.Location = new System.Drawing.Point(181, 38);
            this.UBPRRetrieveMethod.Name = "UBPRRetrieveMethod";
            this.UBPRRetrieveMethod.Size = new System.Drawing.Size(152, 21);
            this.UBPRRetrieveMethod.TabIndex = 7;
            this.UBPRRetrieveMethod.SelectedIndexChanged += new System.EventHandler(this.UBPRRetrieveMethod_SelectedIndexChanged);
            // 
            // UBPRFacsimileReportingCycleEndDate
            // 
            this.UBPRFacsimileReportingCycleEndDate.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList;
            this.UBPRFacsimileReportingCycleEndDate.Location = new System.Drawing.Point(180, 11);
            this.UBPRFacsimileReportingCycleEndDate.Name = "UBPRFacsimileReportingCycleEndDate";
            this.UBPRFacsimileReportingCycleEndDate.Size = new System.Drawing.Size(153, 21);
            this.UBPRFacsimileReportingCycleEndDate.TabIndex = 6;
            // 
            // UBPRFacsimileReportingCycleEndDateLabel
            // 
            this.UBPRFacsimileReportingCycleEndDateLabel.Location = new System.Drawing.Point(20, 14);
            this.UBPRFacsimileReportingCycleEndDateLabel.Name = "UBPRFacsimileReportingCycleEndDateLabel";
            this.UBPRFacsimileReportingCycleEndDateLabel.Size = new System.Drawing.Size(144, 16);
            this.UBPRFacsimileReportingCycleEndDateLabel.TabIndex = 5;
            this.UBPRFacsimileReportingCycleEndDateLabel.Text = "Reporting Period End Date:";
            this.UBPRFacsimileReportingCycleEndDateLabel.TextAlign = System.Drawing.ContentAlignment.MiddleLeft;
            // 
            // UBPRReporterIDLabel
            // 
            this.UBPRReporterIDLabel.Location = new System.Drawing.Point(344, 35);
            this.UBPRReporterIDLabel.Name = "UBPRReporterIDLabel";
            this.UBPRReporterIDLabel.Size = new System.Drawing.Size(99, 23);
            this.UBPRReporterIDLabel.TabIndex = 4;
            this.UBPRReporterIDLabel.Text = "ID RSSD:";
            this.UBPRReporterIDLabel.TextAlign = System.Drawing.ContentAlignment.MiddleRight;
            // 
            // UBPRFIID
            // 
            this.UBPRFIID.Location = new System.Drawing.Point(446, 37);
            this.UBPRFIID.Name = "UBPRFIID";
            this.UBPRFIID.Size = new System.Drawing.Size(128, 20);
            this.UBPRFIID.TabIndex = 3;
            // 
            // UBPRFacsimileFormatLabel
            // 
            this.UBPRFacsimileFormatLabel.Location = new System.Drawing.Point(345, 9);
            this.UBPRFacsimileFormatLabel.Name = "UBPRFacsimileFormatLabel";
            this.UBPRFacsimileFormatLabel.Size = new System.Drawing.Size(98, 23);
            this.UBPRFacsimileFormatLabel.TabIndex = 1;
            this.UBPRFacsimileFormatLabel.Text = "Facsimile Format:";
            this.UBPRFacsimileFormatLabel.TextAlign = System.Drawing.ContentAlignment.MiddleRight;
            // 
            // RetrieveUBPRFacsimileByLabel
            // 
            this.RetrieveUBPRFacsimileByLabel.Location = new System.Drawing.Point(20, 35);
            this.RetrieveUBPRFacsimileByLabel.Name = "RetrieveUBPRFacsimileByLabel";
            this.RetrieveUBPRFacsimileByLabel.Size = new System.Drawing.Size(144, 24);
            this.RetrieveUBPRFacsimileByLabel.TabIndex = 0;
            this.RetrieveUBPRFacsimileByLabel.Text = "Retrieve UBPR Facsimile By:";
            this.RetrieveUBPRFacsimileByLabel.TextAlign = System.Drawing.ContentAlignment.MiddleLeft;
            // 
            // GetUBPRFacsimileButton
            // 
            this.GetUBPRFacsimileButton.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.GetUBPRFacsimileButton.Location = new System.Drawing.Point(471, 10);
            this.GetUBPRFacsimileButton.Name = "GetUBPRFacsimileButton";
            this.GetUBPRFacsimileButton.Size = new System.Drawing.Size(129, 24);
            this.GetUBPRFacsimileButton.TabIndex = 0;
            this.GetUBPRFacsimileButton.Text = "Get UBPR Facsimile";
            this.GetUBPRFacsimileButton.Click += new System.EventHandler(this.GetUBPRFacsimileButton_Click);
            // 
            // groupBox1
            // 
            this.groupBox1.Location = new System.Drawing.Point(-197, 553);
            this.groupBox1.Name = "groupBox1";
            this.groupBox1.Size = new System.Drawing.Size(200, 100);
            this.groupBox1.TabIndex = 12;
            this.groupBox1.TabStop = false;
            this.groupBox1.Text = "groupBox1";
            // 
            // groupBox2
            // 
            this.groupBox2.Anchor = ((System.Windows.Forms.AnchorStyles)(((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Left) 
            | System.Windows.Forms.AnchorStyles.Right)));
            this.groupBox2.Controls.Add(this.GetFilersDateTimeButton);
            this.groupBox2.Controls.Add(this.FiledSinceDateTime);
            this.groupBox2.Controls.Add(this.FilersReportingDateTimeEndDate);
            this.groupBox2.Controls.Add(this.label2);
            this.groupBox2.Controls.Add(this.label1);
            this.groupBox2.Location = new System.Drawing.Point(9, 403);
            this.groupBox2.Name = "groupBox2";
            this.groupBox2.Size = new System.Drawing.Size(606, 46);
            this.groupBox2.TabIndex = 13;
            this.groupBox2.TabStop = false;
            this.groupBox2.Text = "Retrieve Filers Submission DateTime";
            // 
            // GetFilersDateTimeButton
            // 
            this.GetFilersDateTimeButton.Anchor = ((System.Windows.Forms.AnchorStyles)((System.Windows.Forms.AnchorStyles.Top | System.Windows.Forms.AnchorStyles.Right)));
            this.GetFilersDateTimeButton.Location = new System.Drawing.Point(471, 12);
            this.GetFilersDateTimeButton.Name = "GetFilersDateTimeButton";
            this.GetFilersDateTimeButton.Size = new System.Drawing.Size(127, 23);
            this.GetFilersDateTimeButton.TabIndex = 4;
            this.GetFilersDateTimeButton.Text = "Get Filers DateTime";
            this.GetFilersDateTimeButton.UseVisualStyleBackColor = true;
            this.GetFilersDateTimeButton.Click += new System.EventHandler(this.GetFilersDateTimeButton_Click);
            // 
            // FiledSinceDateTime
            // 
            this.FiledSinceDateTime.Location = new System.Drawing.Point(448, 12);
            this.FiledSinceDateTime.Name = "FiledSinceDateTime";
            this.FiledSinceDateTime.Size = new System.Drawing.Size(123, 20);
            this.FiledSinceDateTime.TabIndex = 3;
            // 
            // FilersReportingDateTimeEndDate
            // 
            this.FilersReportingDateTimeEndDate.DropDownStyle = System.Windows.Forms.ComboBoxStyle.DropDownList;
            this.FilersReportingDateTimeEndDate.FormattingEnabled = true;
            this.FilersReportingDateTimeEndDate.Location = new System.Drawing.Point(181, 16);
            this.FilersReportingDateTimeEndDate.Name = "FilersReportingDateTimeEndDate";
            this.FilersReportingDateTimeEndDate.Size = new System.Drawing.Size(150, 21);
            this.FilersReportingDateTimeEndDate.TabIndex = 2;
            // 
            // label2
            // 
            this.label2.AutoSize = true;
            this.label2.Location = new System.Drawing.Point(358, 17);
            this.label2.Name = "label2";
            this.label2.Size = new System.Drawing.Size(88, 13);
            this.label2.TabIndex = 1;
            this.label2.Text = "Filed Since Date:";
            // 
            // label1
            // 
            this.label1.AutoSize = true;
            this.label1.Location = new System.Drawing.Point(22, 18);
            this.label1.Name = "label1";
            this.label1.Size = new System.Drawing.Size(137, 13);
            this.label1.TabIndex = 0;
            this.label1.Text = "Reporting Period End Date:";
            // 
            // Form1
            // 
            this.AutoScaleBaseSize = new System.Drawing.Size(5, 13);
            this.AutoScroll = true;
            this.ClientSize = new System.Drawing.Size(809, 562);
            this.Controls.Add(this.groupBox2);
            this.Controls.Add(this.groupBox1);
            this.Controls.Add(this.groupRetrieveUbprFacsimiles);
            this.Controls.Add(this.groupRetrieveReportingPeriods);
            this.Controls.Add(this.groupFilersSinceDate);
            this.Controls.Add(this.groupLog);
            this.Controls.Add(this.TitleLabel);
            this.Controls.Add(this.groupRetrieveReporters);
            this.Controls.Add(this.groupRetrieveFacsimiles);
            this.Controls.Add(this.groupSaveFolder);
            this.Controls.Add(this.groupUser);
            this.Name = "Form1";
            this.Text = "FFIEC Public Web Service Sample Client";
            this.groupUser.ResumeLayout(false);
            this.groupUser.PerformLayout();
            this.groupSaveFolder.ResumeLayout(false);
            this.groupSaveFolder.PerformLayout();
            this.groupRetrieveFacsimiles.ResumeLayout(false);
            this.groupRetrieveFacsimiles.PerformLayout();
            this.groupRetrieveReporters.ResumeLayout(false);
            this.groupLog.ResumeLayout(false);
            this.groupFilersSinceDate.ResumeLayout(false);
            this.groupFilersSinceDate.PerformLayout();
            this.groupRetrieveReportingPeriods.ResumeLayout(false);
            this.groupRetrieveUbprFacsimiles.ResumeLayout(false);
            this.groupRetrieveUbprFacsimiles.PerformLayout();
            this.groupBox2.ResumeLayout(false);
            this.groupBox2.PerformLayout();
            this.ResumeLayout(false);
            this.PerformLayout();

		}
		#endregion

		/// <summary>
		/// The main entry point for the application.
		/// </summary>
		[STAThread]
		static void Main() 
		{
			Application.Run(new Form1());
		}

        /// <summary>
        /// This method demonstrates the usage of the web service helper method TestUserAccess
        /// In addition to verifying the user id and security token, will verify that the user is using the 
        /// correct URL for the FFIEC Public Web Service.
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
		private void TestUserAccess_Click(object sender, System.EventArgs e)
		{
			bool userHasAccess = false;
			try 
			{
                FFIECPublicWebService.RetrievalService proxy = new FFIECPublicWebService.RetrievalService();
				UsernameToken userToken = new UsernameToken(UserID.Text, UserSecurityToken.Text, PasswordOption.SendHashed);
				proxy.RequestSoapContext.Security.Tokens.Add(userToken);
				userHasAccess = proxy.TestUserAccess();
			}
			catch (SoapException ex) 
			{				
				if (ex.Code.Name.Equals("FailedAuthentication"))
				{
					userHasAccess = false;
				}
				else
				{
					Log("ERROR", "The Web Service returned an error: " + ex.Message);
				}
			}
			catch (Exception ex)
			{
                FFIECPublicWebService.RetrievalService proxy = new FFIECPublicWebService.RetrievalService();
                UsernameToken userToken = new UsernameToken(UserID.Text, UserSecurityToken.Text, PasswordOption.SendHashed);
                proxy.RequestSoapContext.Security.Tokens.Add(userToken);
                Log("ERROR accesssing URL - ", proxy.Url);
			}
			finally
			{
				string message;
				if (userHasAccess)
				{
					message = "User '" + UserID.Text + "' is authorized to access the FFIEC CDR Public Web Service.";
					Log("OK", message);
				}
				else
				{
					message = "User '" + UserID.Text + "' is NOT authorized to access the FFIEC CDR Public Web Service. Please create a user account using the PDD website.";
					Log("ERROR", message);
				}
			}
		}

        /// <summary>
        /// This method demonstrates the usage of the web service helper method RetrieveReportingPeriods
        /// Clients should call this method to obtain a list of available reporting periods in the correct format
        /// to call the other retrieval methods
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void GetReportingPeriodsButton_Click(object sender, EventArgs e)
        {
            try
            {
                FFIECPublicWebService.ReportingDataSeriesName dsName = FFIECPublicWebService.ReportingDataSeriesName.Call;
                string user = this.UserID.Text;
                string password = this.UserSecurityToken.Text;
                if (user == null || user.Length < 1 || password == null)
                {
                    Log("ERROR", "Please enter a valid user id and security token.");
                    return;
                }

                FFIECPublicWebService.RetrievalService proxy = new FFIECPublicWebService.RetrievalService();
                UsernameToken userToken = new UsernameToken(UserID.Text, UserSecurityToken.Text, PasswordOption.SendHashed);
                proxy.RequestSoapContext.Security.Tokens.Add(userToken);

                string[] reportingPeriodEndList = proxy.RetrieveReportingPeriods(dsName);
                this.FacsimileReportingCycleEndDate.Items.AddRange(reportingPeriodEndList);
                this.FacsimileReportingCycleEndDate.SelectedIndex = 0;

                this.PORReportingCycleEndDate.Items.AddRange(reportingPeriodEndList);
                this.PORReportingCycleEndDate.SelectedIndex = 0;

                this.FilersReportingCycleEndDate.Items.AddRange(reportingPeriodEndList);
                this.FilersReportingCycleEndDate.SelectedIndex = 0;

                 this.UBPRFacsimileReportingCycleEndDate.Items.AddRange(reportingPeriodEndList);
                this.UBPRFacsimileReportingCycleEndDate.SelectedIndex = 0;

                this.FilersReportingDateTimeEndDate.Items.AddRange(reportingPeriodEndList);
                this.FilersReportingDateTimeEndDate.SelectedIndex = 0;

                Log("OK", String.Format("Retrieved available reporting periods for {0}.", dsName));
            }
            catch (SoapException ex)
            {
                if (ex.Code.Name.Equals("FailedAuthentication"))
                {
                    Log("ERROR", "User '" + UserID.Text + "' is NOT authorized to access the FFIEC CDR Public Web Service. Please create a user account using the PDD website.");
                }
                else if (ex.Code.Name.Equals("Client.UserQuotaExceeded"))
                {
                    int waitTime = Convert.ToInt32(ex.Detail.Attributes["WaitTime"].Value);
                    Log("OK", String.Format("Web Service quota for user exceeded. Please wait for {0} seconds until the top of the hour for service to renew user quota.", waitTime));
                }
                else
                {
                    Log("ERROR", "The Web Service returned an error: " + ex.Message);
                }
            }
            catch (Exception ex)
            {
                Log("ERROR", ex.Message);
            }
        }

        /// <summary>
        /// This method demonstrates the usage of the web service method RetrieveFacsimile
        /// Clients should call this method to obtain a facsimile of the descired Call report.
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
		private void GetFacsimileButton_Click(object sender, System.EventArgs e)
		{
            try
            {
                FFIECPublicWebService.ReportingDataSeriesName dsName = FFIECPublicWebService.ReportingDataSeriesName.Call;

                if (this.FacsimileReportingCycleEndDate.SelectedItem == null)
                {
                    Log("ERROR", "Must first retrieve available reporting periods by selecting the 'Get Reporting Periods' Button.");
                    return;
                }

                string reportingCycleEndDate = this.FacsimileReportingCycleEndDate.SelectedItem.ToString();

                string retrieveMethod = this.RetrieveMethod.SelectedItem.ToString();
                FFIECPublicWebService.FinancialInstitutionIDType fiIDType = 0;
                if (RETRIEVE_METHOD_BY_RSSD.Equals(retrieveMethod))
                {
                    fiIDType = FFIECPublicWebService.FinancialInstitutionIDType.ID_RSSD;
                }
                else if (RETRIEVE_METHOD_BY_FDIC_CERT.Equals(retrieveMethod))
                {
                    fiIDType = FFIECPublicWebService.FinancialInstitutionIDType.FDICCertNumber;
                }
                else if (RETRIEVE_METHOD_BY_OCC_CHART.Equals(retrieveMethod))
                {
                    fiIDType = FFIECPublicWebService.FinancialInstitutionIDType.OCCChartNumber;
                }
                else if (RETRIEVE_METHOD_BY_OTS_DOCK.Equals(retrieveMethod))
                {
                    fiIDType = FFIECPublicWebService.FinancialInstitutionIDType.OTSDockNumber;
                }

                int fiID = Convert.ToInt32(this.ReporterID.Text);

                FFIECPublicWebService.FacsimileFormat facsimileFormat = (FFIECPublicWebService.FacsimileFormat)
                    Enum.Parse(typeof(FFIECPublicWebService.FacsimileFormat),
                    this.FacsimileFormat.SelectedItem.ToString(), true);

                FFIECPublicWebService.RetrievalService proxy = new FFIECPublicWebService.RetrievalService();
                UsernameToken userToken = new UsernameToken(UserID.Text, UserSecurityToken.Text, PasswordOption.SendHashed);
                proxy.RequestSoapContext.Security.Tokens.Add(userToken);

                Byte[] facsimileByteArray = proxy.RetrieveFacsimile(dsName,
                    reportingCycleEndDate, fiIDType, fiID, facsimileFormat);

                string fileDateStamp = reportingCycleEndDate;
                fileDateStamp = fileDateStamp.Replace("/", "");
                string idType = retrieveMethod.Replace(" ", "_");
                string fileName = "FFIEC Call FI " + fiID.ToString() + " (" + fiIDType.ToString() + ") " + fileDateStamp + ".";
                if (facsimileFormat == FFIECPublicWebService.FacsimileFormat.XBRL)
                    fileName = fileName + "XBRL.xml";
                else
                    fileName = fileName + facsimileFormat;

                string folderName = SaveFolderName.Text;
                string filePath = Path.Combine(folderName, fileName);
                FileStream fileStream = new FileStream(filePath, FileMode.Create, FileAccess.ReadWrite);
                fileStream.Write(facsimileByteArray, 0, facsimileByteArray.Length);
                fileStream.Close();

                Log("OK", "Retrieved facsimile " + filePath);
            }
            catch (SoapException ex)
            {
                if (ex.Code.Name.Equals("FailedAuthentication"))
                {
                    Log("ERROR", "User '" + UserID.Text + "' is NOT authorized to access the FFIEC CDR Public Web Service. Please create a user account using the PDD website.");
                }
                else if (ex.Code.Name.Equals("Client.UserQuotaExceeded"))
                {
                    int waitTime = Convert.ToInt32(ex.Detail.Attributes["WaitTime"].Value);
                    Log("OK", String.Format("Web Service quota for user exceeded. Please wait for {0} seconds until the top of the hour for service to renew user quota.", waitTime));
                }
                else if (ex.Code.Name.Equals("Server.FacsimileNotFound"))
                {
                    Log("ERROR", "Requested facsimile not found in FFICE CDR.");
                }
                else
                {
                    Log("ERROR", "The Web Service returned an error: " + ex.Message);
                }
            }
            catch (Exception ex)
            {
                Log("ERROR", ex.Message);
            }
		}
        
        /// <summary>
        /// This method demonstrates the usage of the web service method RetrievePanelOfReporters
        /// Clients should call this method to obtain a list of all financial institutions who filed Call Report
        /// for a particular reporting period. This method should typically be called once or infrequently to obtain
        /// the complete list of banks in the PoR. Subsequently, the web clients should call RetrieveFilersSinceDate
        /// to find out the list of banks that have filed their original or amended Call Reports.
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
		private void GetReportersButton_Click(object sender, System.EventArgs e)
		{
            try
            {
                if (this.PORReportingCycleEndDate.SelectedItem == null)
                {
                    Log("ERROR", "Must first retrieve available reporting periods by selecting the 'Get Reporting Periods' Button.");
                    return;
                }

                FFIECPublicWebService.ReportingDataSeriesName dsName = FFIECPublicWebService.ReportingDataSeriesName.Call;
                string reportingCycleEndDate = this.PORReportingCycleEndDate.SelectedItem.ToString();

                DialogResult result = MessageBox.Show(this,
                    "This operation will retrieve approximately 8000 banks for the indicated period and will take a few minutes."
                    + " Are you sure you want to continue?",
                    "Get POR",
                    MessageBoxButtons.YesNo);
                if (result == DialogResult.No)
                {
                    Log("OK", "Cancelling Get POR request.");
                    return;
                }
                else
                {
                    Log("OK", "Retrieving POR for " + reportingCycleEndDate);
                    this.Refresh();
                }

                string user = this.UserID.Text;
                string password = this.UserSecurityToken.Text;

                FFIECPublicWebService.RetrievalService proxy = new FFIECPublicWebService.RetrievalService();
                UsernameToken userToken = new UsernameToken(UserID.Text, UserSecurityToken.Text, PasswordOption.SendHashed);
                proxy.RequestSoapContext.Security.Tokens.Add(userToken);
                proxy.Timeout = 400000;

                FFIECPublicWebService.ReportingFinancialInstitution[] reporters =
                    proxy.RetrievePanelOfReporters(dsName, reportingCycleEndDate);

                Log("OK", "Retrieved panel of reporters. ");
                foreach (FFIECPublicWebService.ReportingFinancialInstitution reporter in reporters)
                {
                    Log("OK",
                        String.Format("Bank: {0}, ID_RSSD: {1}, Address: {2}, State: {3}, HasFiled: {4}, FilingType: {5}",
                        reporter.Name.Trim(), reporter.ID_RSSD, reporter.Address, reporter.State, reporter.HasFiledForReportingPeriod, reporter.FilingType.ToString()),
                        false);
                }
                Log("OK", "Total members of POR = " + reporters.Length.ToString());
            }
            catch (SoapException ex)
            {
                if (ex.Code.Name.Equals("FailedAuthentication"))
                {
                    Log("ERROR", "User '" + UserID.Text + "' is NOT authorized to access the FFIEC CDR Public Web Service. Please create a user account using the PDD website.");
                }
                else if (ex.Code.Name.Equals("Client.UserQuotaExceeded"))
                {
                    int waitTime = Convert.ToInt32(ex.Detail.Attributes["WaitTime"].Value);
                    Log("OK", String.Format("Web Service quota for user exceeded. Please wait for {0} seconds until the top of the hour for service to renew user quota.", waitTime));
                }
                else
                {
                    Log("ERROR", "The Web Service returned an error: " + ex.Message);
                }
            }
            catch (Exception ex)
            {
                Log("ERROR", ex.Message);
            }
		}

        /// <summary>
        /// This method demonstrates the usage of the web service method RetrieveFilersSubmissionDateTime
        /// Clients should call this method to keep up to date with the ammendments filed by financial institutions
        /// after a given date/time until now.
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void GetFilersDateTimeButton_Click(object sender, System.EventArgs e)
        {
            try
            {
                if (this.FilersReportingDateTimeEndDate.SelectedItem == null)
                {
                    Log("ERROR", "Must first retrieve available reporting periods by selecting the 'Get Reporting Periods' Button.");
                    return;
                }

                FFIECPublicWebService.ReportingDataSeriesName dsName = FFIECPublicWebService.ReportingDataSeriesName.Call;
                string reportingCycleEndDate = this.FilersReportingDateTimeEndDate.SelectedItem.ToString();
                if (string.IsNullOrEmpty(this.FiledSinceDateTime.Text))
                {
                    MessageBox.Show("Please enter valid date. Format: 'mm/dd/yyyy'", "Filer Since Date Time",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
                else
                {
                    bool valid = FiledSinceDate_Validating(this.FiledSinceDateTime.Text);
                    if (valid)
                    {
                        string filedSinceDate = this.FiledSinceDateTime.Text;
                        string user = this.UserID.Text;
                        string password = this.UserSecurityToken.Text;

                        FFIECPublicWebService.RetrievalService proxy = new FFIECPublicWebService.RetrievalService();
                        UsernameToken userToken = new UsernameToken(UserID.Text, UserSecurityToken.Text, PasswordOption.SendHashed);
                        proxy.RequestSoapContext.Security.Tokens.Add(userToken);

                        FFIECPublicWebService.RetrieveFilersDateTime[] rssdsDateTimes = proxy.RetrieveFilersSubmissionDateTime(dsName, reportingCycleEndDate, filedSinceDate);

                        Log("OK", String.Format("Retrieved filers for reporting cycle {0} who filed since {1}.",
                            reportingCycleEndDate, filedSinceDate));
                        foreach (FFIECPublicWebService.RetrieveFilersDateTime rssdsDateTime in rssdsDateTimes)
                        {
                            Log("OK",
                                String.Format("ID_RSSD: {0}, DateTime: {1}",
                                rssdsDateTime.ID_RSSD, rssdsDateTime.DateTime));
                        }
                    }
                }
            }
            catch (SoapException ex)
            {
                if (ex.Code.Name.Equals("FailedAuthentication"))
                {
                    Log("ERROR", "User '" + UserID.Text + "' is NOT authorized to access the FFIEC CDR Public Web Service. Please create a user account using the PDD website.");
                }
                else if (ex.Code.Name.Equals("Client.UserQuotaExceeded"))
                {
                    int waitTime = Convert.ToInt32(ex.Detail.Attributes["WaitTime"].Value);
                    Log("OK", String.Format("Web Service quota for user exceeded. Please wait for {0} seconds until the top of the hour for service to renew user quota.", waitTime));

                }
                else
                {
                    Log("ERROR", "The Web Service returned an error: " + ex.Message);
                }
            }
            catch (Exception ex)
            {
                Log("ERROR", ex.Message);
            }
        }


        /// <summary>
        /// This method demonstrates the usage of the web service method RetrieveFilersSinceDate
        /// Clients should call this method to keep up to date with the ammendments filed by financial institutions
        /// after a given date/time until now.
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
		private void GetFilersButton_Click(object sender, System.EventArgs e)
		{
            try
            {
                if (string.IsNullOrEmpty(this.FiledSinceDate.Text))
                {
                    MessageBox.Show("Please enter valid date. Format: 'mm/dd/yyyy'", "Filed Since Date",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
                else
                {
                    bool valid = FiledSinceDate_Validating(this.FiledSinceDate.Text);
                    if (valid)
                    {
                        if (this.FilersReportingCycleEndDate.SelectedItem == null)
                        {
                            Log("ERROR", "Must first retrieve available reporting periods by selecting the 'Get Reporting Periods' Button.");
                            return;
                        }

                        FFIECPublicWebService.ReportingDataSeriesName dsName = FFIECPublicWebService.ReportingDataSeriesName.Call;
                        string reportingCycleEndDate = this.FilersReportingCycleEndDate.SelectedItem.ToString();
                        string filedSinceDate = this.FiledSinceDate.Text;
                        string user = this.UserID.Text;
                        string password = this.UserSecurityToken.Text;

                        FFIECPublicWebService.RetrievalService proxy = new FFIECPublicWebService.RetrievalService();
                        UsernameToken userToken = new UsernameToken(UserID.Text, UserSecurityToken.Text, PasswordOption.SendHashed);
                        proxy.RequestSoapContext.Security.Tokens.Add(userToken);

                        int[] rssds = proxy.RetrieveFilersSinceDate(dsName, reportingCycleEndDate, filedSinceDate);

                        Log("OK", String.Format("Retrieved filers for reporting cycle {0} who filed since {1}.",
                            reportingCycleEndDate, filedSinceDate));
                        foreach (int rssd in rssds)
                        {
                            Log("OK", String.Format("ID_RSSD: {0}", rssd));
                        }
                    }
                }
            }
            catch (SoapException ex)
            {
                if (ex.Code.Name.Equals("FailedAuthentication"))
                {
                    Log("ERROR", "User '" + UserID.Text + "' is NOT authorized to access the FFIEC CDR Public Web Service. Please create a user account using the PDD website.");
                }
                else if (ex.Code.Name.Equals("Client.UserQuotaExceeded"))
                {
                    int waitTime = Convert.ToInt32(ex.Detail.Attributes["WaitTime"].Value);
                    Log("OK", String.Format("Web Service quota for user exceeded. Please wait for {0} seconds until the top of the hour for service to renew user quota.", waitTime));

                }
                else
                {
                    Log("ERROR", "The Web Service returned an error: " + ex.Message);
                }
            }
            catch (Exception ex)
            {
                Log("ERROR", ex.Message);
            }
		}

        /// <summary>
        /// This method demonstrates the usage of the web service helper method RetrieveUBPRReportingPeriods
        /// Clients should call this method to obtain a list of available reporting periods in the correct format
        /// to call the other retrieval methods
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void GetUBPRReportingPeriodsButton_Click(object sender, EventArgs e)
        {
            try
            {
                string user = this.UserID.Text;
                string password = this.UserSecurityToken.Text;
                if (user == null || user.Length < 1 || password == null)
                {
                    Log("ERROR", "Please enter a valid user id and security token.");
                    return;
                }

                FFIECPublicWebService.RetrievalService proxy = new FFIECPublicWebService.RetrievalService();
                UsernameToken userToken = new UsernameToken(UserID.Text, UserSecurityToken.Text, PasswordOption.SendHashed);
                proxy.RequestSoapContext.Security.Tokens.Add(userToken);

                string[] reportingPeriodEndList = proxy.RetrieveUBPRReportingPeriods();
                this.UBPRFacsimileReportingCycleEndDate.Items.AddRange(reportingPeriodEndList);
                this.UBPRFacsimileReportingCycleEndDate.SelectedIndex = 0;

                Log("OK", "Retrieved available UBPR reporting periods.");
            }
            catch (SoapException ex)
            {
                if (ex.Code.Name.Equals("FailedAuthentication"))
                {
                    Log("ERROR", "User '" + UserID.Text + "' is NOT authorized to access the FFIEC CDR Public Web Service. Please create a user account using the PDD website.");
                }
                else if (ex.Code.Name.Equals("Client.UserQuotaExceeded"))
                {
                    int waitTime = Convert.ToInt32(ex.Detail.Attributes["WaitTime"].Value);
                    Log("OK", String.Format("Web Service quota for user exceeded. Please wait for {0} seconds until the top of the hour for service to renew user quota.", waitTime));
                }
                else
                {
                    Log("ERROR", "The Web Service returned an error: " + ex.Message);
                }
            }
            catch (Exception ex)
            {
                Log("ERROR", ex.Message);
            }
        }

        /// <summary>
        /// This method demonstrates the usage of the web service method RetrieveUBPRXBRLFacsimile
        /// Clients should call this method to obtain a facsimile of the descired Call report.
        /// </summary>
        /// <param name="sender"></param>
        /// <param name="e"></param>
        private void GetUBPRFacsimileButton_Click(object sender, EventArgs e)
        {
            try
            {
                if (this.UBPRFacsimileReportingCycleEndDate.SelectedItem == null)
                {
                    Log("ERROR", "Must first retrieve available reporting periods by selecting the 'Get UBPR Reporting Periods' Button.");
                    return;
                }

                string reportingCycleEndDate = this.UBPRFacsimileReportingCycleEndDate.SelectedItem.ToString();

                string retrieveMethod = this.UBPRRetrieveMethod.SelectedItem.ToString();
                FFIECPublicWebService.FinancialInstitutionIDType fiIDType = 0;
                if (RETRIEVE_METHOD_BY_RSSD.Equals(retrieveMethod))
                {
                    fiIDType = FFIECPublicWebService.FinancialInstitutionIDType.ID_RSSD;
                }
                else if (RETRIEVE_METHOD_BY_FDIC_CERT.Equals(retrieveMethod))
                {
                    fiIDType = FFIECPublicWebService.FinancialInstitutionIDType.FDICCertNumber;
                }
                else if (RETRIEVE_METHOD_BY_OCC_CHART.Equals(retrieveMethod))
                {
                    fiIDType = FFIECPublicWebService.FinancialInstitutionIDType.OCCChartNumber;
                }
                else if (RETRIEVE_METHOD_BY_OTS_DOCK.Equals(retrieveMethod))
                {
                    fiIDType = FFIECPublicWebService.FinancialInstitutionIDType.OTSDockNumber;
                }

                int fiID = Convert.ToInt32(this.UBPRFIID.Text);

                FFIECPublicWebService.RetrievalService proxy = new FFIECPublicWebService.RetrievalService();
                UsernameToken userToken = new UsernameToken(UserID.Text, UserSecurityToken.Text, PasswordOption.SendHashed);
                proxy.RequestSoapContext.Security.Tokens.Add(userToken);

                Byte[] facsimileByteArray = proxy.RetrieveUBPRXBRLFacsimile(reportingCycleEndDate, fiIDType, fiID);

                string fileDateStamp = reportingCycleEndDate;
                fileDateStamp = fileDateStamp.Replace("/", "");
                string idType = retrieveMethod.Replace(" ", "_");
                string fileName = "FFIEC UBPR FI " + fiID.ToString() + " (" + fiIDType.ToString() + ") " + fileDateStamp + ".XBRL.xml";

                string folderName = SaveFolderName.Text;
                string filePath = Path.Combine(folderName, fileName);
                FileStream fileStream = new FileStream(filePath, FileMode.Create, FileAccess.ReadWrite);
                fileStream.Write(facsimileByteArray, 0, facsimileByteArray.Length);
                fileStream.Close();

                Log("OK", "Retrieved UBPR XBRL facsimile " + filePath);
            }
            catch (SoapException ex)
            {
                if (ex.Code.Name.Equals("FailedAuthentication"))
                {
                    Log("ERROR", "User '" + UserID.Text + "' is NOT authorized to access the FFIEC CDR Public Web Service. Please create a user account using the PDD website.");
                }
                else if (ex.Code.Name.Equals("Client.UserQuotaExceeded"))
                {
                    int waitTime = Convert.ToInt32(ex.Detail.Attributes["WaitTime"].Value);
                    Log("OK", String.Format("Web Service quota for user exceeded. Please wait for {0} seconds until the top of the hour for service to renew user quota.", waitTime));
                }
                else if (ex.Code.Name.Equals("Server.FacsimileNotFound"))
                {
                    Log("ERROR", "Requested facsimile not found in FFICE CDR.");
                }
                else
                {
                    Log("ERROR", "The Web Service returned an error: " + ex.Message);
                }
            }
            catch (Exception ex)
            {
                Log("ERROR", ex.Message);
            }
        }

		private void BrowseFolderSelect_Click(object sender, System.EventArgs e)
		{
			DialogResult result = SaveFolderBrowserDialog.ShowDialog();
			if( result == DialogResult.OK )
			{
				SaveFolderName.Text = SaveFolderBrowserDialog.SelectedPath;
				Log("OK", "Folder " + SaveFolderName.Text + " selected to store retrieved facsimiles.");
			}
		}

		private void ClearFolderSelect_Click(object sender, System.EventArgs e)
		{
			try
			{
				if (SaveFolderName.Text.Length > 0)
				{
					//Delete all files in directory
					DirectoryInfo di = new DirectoryInfo(SaveFolderName.Text);	
					Log("OK", "Deleting all files in folder '" + SaveFolderName.Text + "'.");
					foreach (FileInfo fi in di.GetFiles())
					{
						fi.Delete();
					}
					Log("OK", "All files in folder '" + SaveFolderName.Text + "' deleted.");
				}
			}
			catch (Exception ex)
			{
				Log("ERROR", ex.Message);
			}
		}

		private void RetrieveMethod_SelectedIndexChanged(object sender, System.EventArgs e)
		{
			this.ReporterIDLabel.Text = this.RetrieveMethod.SelectedItem + ":";
		}

		//private void FiledSinceDate_Validating(object sender, System.ComponentModel.CancelEventArgs e)
        private bool FiledSinceDate_Validating(string sinceDate)
		{
            string dateText = sinceDate.Trim();
			try 
			{
                if (string.IsNullOrEmpty(dateText))
                {
                    MessageBox.Show("Invalid Date Selected. Please select no date or valid date. Format: 'mm/dd/yyyy'", "Filed Since Date",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return false;
                }
                else
                {
                    DateTime dt = Convert.ToDateTime(dateText);
                    return true;
                }
			}
			catch (FormatException)
			{
				//e.Cancel = true;
                this.FiledSinceDate.Select(0, this.FiledSinceDate.Text.Length);
                MessageBox.Show("Invalid Date Selected. Please select no date or valid date. Format: 'mm/dd/yyyy'", "Filed Since Date",
                    MessageBoxButtons.OK, MessageBoxIcon.Error);
			}
            return false;
		}

        private void Log(string messageType, string message)
        {
            Log(messageType, message, true);
        }

        private void Log(string messageType, string message, bool refresh)
        {
            string messageTime = System.DateTime.Now.ToString("MM/dd/yyyy HH:mm:ss");
            string record = String.Format("[{0}] {1}: {2}", messageTime, messageType, message);
            LogPane.SelectionColor = messageType.Equals("ERROR") ? Color.Red : Color.Black;
            LogPane.AppendText(record + "\n");
            LogPane.Focus();
            if (refresh)
            {
                LogPane.ScrollToCaret();
                LogPane.Refresh();
            }
        }

        private void ClearLogButton_Click(object sender, EventArgs e)
        {
            LogPane.Text = "";
        }

        private void UBPRRetrieveMethod_SelectedIndexChanged(object sender, EventArgs e)
        {
            this.UBPRReporterIDLabel.Text = this.UBPRRetrieveMethod.SelectedItem + ":";
        }
	}
}
