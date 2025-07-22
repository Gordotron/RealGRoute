# RealGRoute

Overview

RealGRoute is a safe route planning application designed to help users navigate urban areas in Colombia with greater security. Leveraging open government crime data, artificial intelligence (AI), and digital maps, RealGRoute provides real-time notifications on insecurity levels, suggests safer routes, and enables rapid incident reporting by citizens.

Motivation

Urban insecurity in Colombia deeply impacts quality of life, social cohesion, and economic development. Traditional navigation systems prioritize efficiency, often neglecting safety concerns. RealGRoute addresses this gap by integrating real-time crime analytics, route optimization, and citizen participation to minimize users’ exposure to risks such as crime and traffic accidents.

Key Features

Real-Time Security Notifications

Integrates multiple data sources including official police records, IoT sensors, and crowdsourced reports.
Notifies users about insecurity levels in specific areas, helping them make safer decisions.
AI-Powered Safe Route Planning

Uses historical and real-time crime data to assess risk dynamically.
Applies machine learning algorithms to predict high-risk zones.
Optimizes routes using safety scores, not just efficiency (distance/time).
Offers personalized recommendations based on user preferences (e.g., mode of transport, time of day).
Crowdsourced Incident Reporting

Empowers citizens to report incidents via a mobile platform.
Validates reports using automated checks, cross-referencing, and expert review.
Utilizes NLP for extracting structured data from user narratives.
Technologies Used

Languages: Python (primary), Cython, C, TypeScript, C++, Fortran
Data Processing: AI/ML algorithms, GIS analytics, Kernel Density Estimation, clustering
Routing Algorithms: Shortest path (Dijkstra’s, A*), k-shortest paths, Reinforcement Learning
Integration: OpenStreetMap, commercial map APIs, distributed networks for real-time updates
Project Objectives

Develop a real-time insecurity notification system
Timely alerts allow users to adapt routes or behaviors and avoid high-risk areas.
Design a safe route suggestion engine based on crime data
Routing algorithms incorporate risk scores derived from open crime databases and predictive models.
Enable fast and secure citizen incident reporting
A user-friendly mobile interface supports structured and narrative reports, with backend validation for reliability.
Methodology

Data Sources: Open crime datasets, official police dispatches, crowdsourced reports, social media, traffic information
Validation: Multi-method approach including cross-validation, machine learning, crowdsourced feedback, expert review, and NLP
Fairness & Ethics: “Fairness-by-design” principles, bias mitigation, accuracy and fairness metrics, context-specific adaptation for Colombian realities
Challenges and Considerations

Data Quality: Crime data may be incomplete, imprecise, or affected by underreporting and institutional biases.
Validation: Essential to prevent misinformation and misuse; combines automated and human-in-the-loop strategies.
Integration: System must robustly manage heterogeneous data and ensure seamless interaction between modules.
User Adoption: Trust, usability, and clear communication are vital for effectiveness.
Ethics: AI models must be transparent, fair, and adapted to local social contexts.
Usage Example

Getting Started

Install dependencies:
Refer to requirements.txt for Python packages.
Set up crime data sources:
Configure access to open government databases and map APIs.
Run the application:
Launch the app via command-line or mobile interface.
Acknowledgments

Lead Author: Óscar Andrés Guzmán Vásquez
Department of Engineering, Universidad Nacional de Colombia

References:
Extensive literature review and research citations are included in the project documentation and academic references section.

License

(Include license information here if available.)

Contact

For academic inquiries or collaboration:
oguzmanv@unal.edu.co

Contributing

Contributions are welcome! Please submit issues and pull requests via GitHub.

References

See the attached research literature for methodologies, technologies, and state-of-the-art approaches used in RealGRoute.

Tags: Urban safety, safe route planning, crime data analytics, real-time alert systems, machine learning, GIS, crowdsourced reporting, mobile applications, algorithmic fairness.
